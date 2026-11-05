
from pathlib import Path
from uuid import UUID
from app.services.document_processing import process_document

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models import Collection, Document, User
from app.schemas.documents import DocumentResponse
from app.services.document_storage import (
    delete_stored_file,
    get_stored_file_path,
    save_pdf,
)

from app.schemas.search import (
    SemanticSearchRequest,
    SemanticSearchResponse,
)
from app.services.search_service import semantic_search


router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile = File(...),
    collection_id: UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if collection_id is not None:
        collection = db.scalar(
            select(Collection).where(
                Collection.id == collection_id,
                Collection.user_id == current_user.id,
            )
        )

        if collection is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found.",
            )

    original_filename = Path(
        (file.filename or "document.pdf").replace("\\", "/")
    ).name

    storage_key, sha256, size_bytes = await save_pdf(
        file=file,
        user_id=current_user.id,
    )

    document = Document(
        user_id=current_user.id,
        collection_id=collection_id,
        original_filename=original_filename,
        storage_key=storage_key,
        mime_type="application/pdf",
        size_bytes=size_bytes,
        sha256=sha256,
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()
        delete_stored_file(storage_key)
        raise

    return document


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    statement = (
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .offset(offset)
        .limit(limit)
    )

    return db.scalars(statement).all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return document


@router.post(
    "/search/semantic",
    response_model=SemanticSearchResponse,
)
def search_documents(
    payload: SemanticSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = semantic_search(
        db=db,
        user_id=current_user.id,
        query=payload.query,
        limit=payload.limit,
    )

    return {
        "query": payload.query,
        "results": results,
        "total_results": len(results),
    }



@router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    file_path = get_stored_file_path(document.storage_key)

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored PDF file not found.",
        )

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=document.original_filename,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    storage_key = document.storage_key

    try:
        db.delete(document)
        db.commit()
    except Exception:
        db.rollback()
        raise

    delete_stored_file(storage_key)


@router.post("/{document_id}/process")
def process_uploaded_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = process_document(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if result.get("not_found"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    if result["status"] == "failed":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result["error"],
        )

    return result
