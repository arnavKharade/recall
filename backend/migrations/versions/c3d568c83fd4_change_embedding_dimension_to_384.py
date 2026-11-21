"""change embedding dimension to 384

Revision ID: c3d568c83fd4
Revises: 0c3864e3eb75
Create Date: 2026-11-05 20:24:21.001092

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'c3d568c83fd4'
down_revision: Union[str, Sequence[str], None] = '0c3864e3eb75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "document_chunks",
        "embedding",
        existing_type=Vector(1536),
        type_=Vector(384),
        existing_nullable=True,
        postgresql_using="embedding::vector(384)",
    )


def downgrade() -> None:
    op.alter_column(
        "document_chunks",
        "embedding",
        existing_type=Vector(384),
        type_=Vector(1536),
        existing_nullable=True,
        postgresql_using="embedding::vector(1536)",
    )
