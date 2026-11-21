
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models import Collection, Document, User
from app.schemas.collections import (
    CollectionCreate,
    CollectionResponse,
    CollectionUpdate,
)

router = APIRouter(prefix="/collections", tags=["Collections"])


def serialize_collection(
    db: Session,
    collection: Collection,
) -> CollectionResponse:
    document_count = db.scalar(
        select(func.count(Document.id)).where(
            Document.collection_id == collection.id,
            Document.user_id == collection.user_id,
        )
    ) or 0

    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        document_count=document_count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.get("", response_model=list[CollectionResponse])
def list_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    collections = db.scalars(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.updated_at.desc())
    ).all()

    return [
        serialize_collection(db, collection)
        for collection in collections
    ]


@router.post(
    "",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_collection(
    payload: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Collection name cannot be empty.",
        )

    collection = Collection(
        user_id=current_user.id,
        name=name,
        description=payload.description,
    )

    try:
        db.add(collection)
        db.commit()
        db.refresh(collection)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A collection with this name already exists.",
        ) from exc

    return serialize_collection(db, collection)


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    collection = db.scalar(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )

    if collection is None:
        raise HTTPException(
            status_code=404,
            detail="Collection not found.",
        )

    return serialize_collection(db, collection)


@router.patch(
    "/{collection_id}",
    response_model=CollectionResponse,
)
def update_collection(
    collection_id: UUID,
    payload: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    collection = db.scalar(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )

    if collection is None:
        raise HTTPException(
            status_code=404,
            detail="Collection not found.",
        )

    changes = payload.model_dump(exclude_unset=True)

    if "name" in changes:
        name = changes["name"]

        if name is None or not name.strip():
            raise HTTPException(
                status_code=400,
                detail="Collection name cannot be empty.",
            )

        changes["name"] = name.strip()

    for field, value in changes.items():
        setattr(collection, field, value)

    try:
        db.commit()
        db.refresh(collection)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A collection with this name already exists.",
        ) from exc

    return serialize_collection(db, collection)


@router.delete(
    "/{collection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_collection(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    collection = db.scalar(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id,
        )
    )

    if collection is None:
        raise HTTPException(
            status_code=404,
            detail="Collection not found.",
        )

    try:
        # Preserve documents when their collection is deleted.
        db.query(Document).filter(
            Document.collection_id == collection.id,
            Document.user_id == current_user.id,
        ).update(
            {Document.collection_id: None},
            synchronize_session=False,
        )

        db.delete(collection)
        db.commit()

    except Exception:
        db.rollback()
        raise
