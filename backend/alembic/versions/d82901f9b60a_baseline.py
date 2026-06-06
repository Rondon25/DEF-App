"""baseline

Revision ID: d82901f9b60a
Revises: 
Create Date: 2026-06-06 02:19:22.927399

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd82901f9b60a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Baseline — schema already created via models; no-op."""
    pass


def downgrade() -> None:
    pass
