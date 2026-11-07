
import logging

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models import (
    Conversation,
    DocumentChunk,
    Message,
    MessageRole,
    MessageSource,
    User,
)
from app.schemas.conversation import (
    AskQuestionRequest,
    AskQuestionResponse,
    CitationResponse,
    ConversationDetailResponse,
    ConversationResponse,
    MessageResponse,
)
from app.services.rag_service import (
    INSUFFICIENT_EVIDENCE,
    generate_rag_answer,
)
from app.services.search_service import semantic_search


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"],
)


# ==========================================
# SERIALIZATION
# ==========================================

def serialize_message(message: Message) -> MessageResponse:
    citations = []

    for source in sorted(
        message.sources,
        key=lambda item: item.citation_order,
    ):
        chunk = source.chunk
        document = chunk.document

        citations.append(
            CitationResponse(
                chunk_id=chunk.id,
                document_id=document.id,
                document_name=document.original_filename,
                page_number=chunk.page_number,
                quoted_text=source.quoted_text or chunk.content,
                relevance_score=(
                    source.relevance_score
                    if source.relevance_score is not None
                    else 0.0
                ),
                citation_order=source.citation_order,
            )
        )

    return MessageResponse(
        id=message.id,
        role=message.role.value,
        content=message.content,
        model_name=message.model_name,
        created_at=message.created_at,
        citations=citations,
    )


# ==========================================
# ASK QUESTION
# ==========================================

@router.post(
    "/ask",
    response_model=AskQuestionResponse,
)
def ask_question(
    payload: AskQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # 1. Find or create conversation.

        if payload.conversation_id is None:
            conversation = Conversation(
                user_id=current_user.id,
                title=payload.question[:60].strip(),
            )

            db.add(conversation)
            db.flush()

        else:
            conversation = db.scalar(
                select(Conversation).where(
                    Conversation.id == payload.conversation_id,
                    Conversation.user_id == current_user.id,
                )
            )

            if conversation is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found.",
                )

        # 2. Retrieve relevant document passages.

        retrieval_limit = min(
            max(settings.rag_top_k, 8),
            12,
        )

        retrieved_sources = semantic_search(
            db=db,
            user_id=current_user.id,
            query=payload.question,
            limit=retrieval_limit,
        )

        logger.info(
            "Recall retrieval completed: retrieved=%s requested=%s",
            len(retrieved_sources),
            retrieval_limit,
        )

        # 3. Use ranked retrieval results directly.
        # RRF scores are ranking signals, not cosine similarity
        # probabilities. Do not apply a cosine threshold here.

        relevant_sources = retrieved_sources

        logger.info(
            "Recall evidence selection completed: sources=%s pages=%s",
            len(relevant_sources),
            sorted({
                source["page_number"]
                for source in relevant_sources
            }),
        )

        # 4. Load recent conversation history.

        history_statement = (
            select(Message)
            .where(
                Message.conversation_id == conversation.id,
            )
            .order_by(Message.created_at.desc())
            .limit(8)
        )

        previous_messages = list(
            reversed(db.scalars(history_statement).all())
        )

        history = [
            {
                "role": message.role.value,
                "content": message.content,
            }
            for message in previous_messages
            if message.role in (
                MessageRole.USER,
                MessageRole.ASSISTANT,
            )
        ]

        # 5. Save user message.

        user_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=payload.question,
        )

        db.add(user_message)
        db.flush()

        # 6. Generate answer and identify cited sources.

        if relevant_sources:
            answer, cited_sources = generate_rag_answer(
                question=payload.question,
                sources=relevant_sources,
                history=history,
            )
        else:
            answer = INSUFFICIENT_EVIDENCE
            cited_sources = []

        logger.info(
            "Recall answer generation completed: cited_sources=%s",
            len(cited_sources),
        )

        # 7. Save assistant message.

        assistant_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=answer,
            model_name=(
                settings.ollama_model
                if cited_sources
                else None
            ),
        )

        db.add(assistant_message)
        db.flush()

        # 8. Persist only validated citations.

        for index, source in enumerate(
            cited_sources,
            start=1,
        ):
            chunk = db.get(
                DocumentChunk,
                UUID(source["chunk_id"]),
            )

            if chunk is None:
                continue

            db.add(
                MessageSource(
                    message_id=assistant_message.id,
                    chunk_id=chunk.id,
                    relevance_score=source["similarity"],
                    quoted_text=chunk.content,
                    citation_order=index,
                )
            )

        # 9. Update conversation activity.

        conversation.updated_at = datetime.now(timezone.utc)

        # 10. Commit transaction.

        db.commit()

        # 11. Reload assistant message with citation relationships.

        assistant_message = db.scalar(
            select(Message)
            .where(
                Message.id == assistant_message.id,
            )
            .options(
                selectinload(Message.sources)
                .selectinload(MessageSource.chunk)
                .selectinload(DocumentChunk.document)
            )
        )

        user_message = db.get(
            Message,
            user_message.id,
        )

        return AskQuestionResponse(
            conversation_id=conversation.id,
            user_message=serialize_message(user_message),
            assistant_message=serialize_message(assistant_message),
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        logger.exception("Recall conversation request failed.")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                str(exc)
                if settings.app_env == "development"
                else "Unable to generate an answer right now."
            ),
        ) from exc


# ==========================================
# LIST CONVERSATIONS
# ==========================================

@router.get(
    "",
    response_model=list[ConversationResponse],
)
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(Conversation)
        .where(
            Conversation.user_id == current_user.id,
        )
        .order_by(
            Conversation.updated_at.desc(),
        )
    )

    return db.scalars(statement).all()


# ==========================================
# GET CONVERSATION WITH MESSAGES
# ==========================================

@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
)
def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .options(
            selectinload(Conversation.messages)
            .selectinload(Message.sources)
            .selectinload(MessageSource.chunk)
            .selectinload(DocumentChunk.document)
        )
    )

    conversation = db.scalar(statement)

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            serialize_message(message)
            for message in conversation.messages
        ],
    )


# ==========================================
# DELETE CONVERSATION
# ==========================================

@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    try:
        db.delete(conversation)
        db.commit()

    except Exception:
        db.rollback()
        raise
