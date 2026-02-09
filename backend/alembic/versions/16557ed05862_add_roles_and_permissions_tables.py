"""Add roles and permissions tables

Revision ID: 16557ed05862
Revises: 8dc00eae3126
Create Date: 2026-02-03 13:45:41.431945

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision: str = '16557ed05862'
down_revision: Union[str, Sequence[str], None] = '8dc00eae3126'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the new 'role_id' column (nullable for now)
    op.add_column('profiles', sa.Column('role_id', sa.Integer(), nullable=True))
    
    # 2. Create the Foreign Key link
    # (We assume 'roles' table exists as you mentioned)
    op.create_foreign_key(None, 'profiles', 'roles', ['role_id'], ['id'])

    # --- DATA MIGRATION (The Important Part) ---
    
    # Define a temporary reference to the 'roles' table
    roles_table = table('roles',
        column('id', sa.Integer),
        column('name', sa.String),
        column('slug', sa.String),
        column('is_active', sa.Boolean)
    )

    # 3. Insert the Default Roles so we have IDs to map to
    # We use explicit IDs (1, 2, 3) to guarantee the mapping works
    op.bulk_insert(roles_table, [
        {'id': 1, 'name': 'Super Admin', 'slug': 'admin', 'is_active': True},
        {'id': 2, 'name': 'Customer', 'slug': 'customer', 'is_active': True},
        {'id': 3, 'name': 'Vendor', 'slug': 'vendor', 'is_active': True},
    ])

    # 4. Map existing users from String to ID
    # If user was 'admin' -> set role_id = 1
    op.execute("UPDATE profiles SET role_id = 1 WHERE role = 'admin'")
    op.execute("UPDATE profiles SET role_id = 2 WHERE role = 'customer'")
    op.execute("UPDATE profiles SET role_id = 3 WHERE role = 'vendor'")
    
    # Safety Net: If anyone has a weird role, default them to Customer (2)
    op.execute("UPDATE profiles SET role_id = 2 WHERE role_id IS NULL")

    # 5. Now it is safe to drop the old string column
    op.drop_column('profiles', 'role')
    
    # 6. Make the new column required (nullable=False)
    op.alter_column('profiles', 'role_id', nullable=False)

def downgrade() -> None:
    # Reverse the process if needed
    op.add_column('profiles', sa.Column('role', sa.VARCHAR(length=20), autoincrement=False, nullable=True))
    
    # Map IDs back to Strings
    op.execute("UPDATE profiles SET role = 'admin' WHERE role_id = 1")
    op.execute("UPDATE profiles SET role = 'customer' WHERE role_id = 2")
    op.execute("UPDATE profiles SET role = 'vendor' WHERE role_id = 3")
    
    op.drop_constraint(None, 'profiles', type_='foreignkey')
    op.drop_column('profiles', 'role_id')
