"""
Seeds permissions for address and menu pages, assigns all to Super Admin (id=1).
Safe to run multiple times — skips anything that already exists.

Usage (from backend/ folder):
    python seed_address_permission.py
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.models.models import Permission, Role

# All permissions to seed: (slug, name, description)
PERMISSIONS = [
    ("address:add",    "Add Address",   "Allows adding addresses for users"),
    ("meal:view",      "View Meals",    "Allows viewing the menu/meals list"),
    ("meal:create",    "Create Meal",   "Allows creating new meals"),
    ("meal:update",    "Update Meal",   "Allows editing existing meals"),
]

def seed():
    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter(Role.id == 1).first()
        if not admin_role:
            print("  ERROR: Super Admin role (id=1) not found. Aborting.")
            return

        for slug, name, description in PERMISSIONS:
            perm = db.query(Permission).filter(Permission.slug == slug).first()
            if not perm:
                perm = Permission(name=name, slug=slug, description=description)
                db.add(perm)
                db.flush()
                print(f"  Created permission: {slug} (id={perm.id})")
            else:
                print(f"  Already exists:     {slug} (id={perm.id})")

            if perm not in admin_role.permissions:
                admin_role.permissions.append(perm)
                print(f"    → Assigned to '{admin_role.name}'")
            else:
                print(f"    → Already assigned to '{admin_role.name}'")

        db.commit()
        print("\nDone.")
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
