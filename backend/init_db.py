# from __future__ import annotations

# import logging
# from datetime import datetime
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy import create_engine, text
# from database import Base, DATABASE_URL, engine
# import models

# from models import User, Permission, RolePermission, UserRole, CalendarEvent, EventAttendee, EventReminder, Project, TaskDependency, ProjectTask

# logging.basicConfig(level=logging.INFO)
# log = logging.getLogger("init_db")


# # Create tables
# # engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
# # Base.metadata.create_all(bind=engine)

# # print("Database tables created successfully!")

# # Create default permissions
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# # db = SessionLocal()

# def _enable_sqlite_foreign_keys(session):
#     """Enable FK checks for SQLite (no-op for Postgres/MySQL)."""
#     if DATABASE_URL.startswith("sqlite"):
#         session.execute(text("PRAGMA foreign_keys=ON;"))

# def create_tables():
#     log.info("Creating all tables (if missing)...")
#     Base.metadata.create_all(bind=engine)
#     log.info("✅ Tables ready.")

# # Define default permissions
# default_permissions = [
#     # Document Management
#     {"name": "create_document", "description": "Create new documents", "module": "document", "action": "create"},
#     {"name": "read_document", "description": "View documents", "module": "document", "action": "read"},
#     {"name": "update_document", "description": "Edit documents", "module": "document", "action": "update"},
#     {"name": "delete_document", "description": "Delete documents", "module": "document", "action": "delete"},
    
#     # Audit Management
#     {"name": "create_audit", "description": "Create new audits", "module": "audit", "action": "create"},
#     {"name": "read_audit", "description": "View audits", "module": "audit", "action": "read"},
#     {"name": "update_audit", "description": "Edit audits", "module": "audit", "action": "update"},
#     {"name": "delete_audit", "description": "Delete audits", "module": "audit", "action": "delete"},
    
#     # User Management
#     {"name": "create_user", "description": "Create new users", "module": "user", "action": "create"},
#     {"name": "read_user", "description": "View users", "module": "user", "action": "read"},
#     {"name": "update_user", "description": "Edit users", "module": "user", "action": "update"},
#     {"name": "delete_user", "description": "Delete users", "module": "user", "action": "delete"},
    
#     # Incident Management
#     {"name": "create_incident", "description": "Create incident reports", "module": "incident", "action": "create"},
#     {"name": "read_incident", "description": "View incident reports", "module": "incident", "action": "read"},
#     {"name": "update_incident", "description": "Edit incident reports", "module": "incident", "action": "update"},
#     {"name": "delete_incident", "description": "Delete incident reports", "module": "incident", "action": "delete"},
# ]

# ROLE_TO_PERMISSION_LEVEL = {
#     UserRole.SUPER_ADMIN: PermissionLevel.SUPER_ADMIN,
#     UserRole.ADMIN:       PermissionLevel.ADMIN_ACCESS,
#     UserRole.MANAGER:     PermissionLevel.EDIT_ACCESS,
#     UserRole.AUDITOR:     PermissionLevel.EDIT_ACCESS,     # adjust if you want read-only
#     UserRole.EMPLOYEE:    PermissionLevel.VIEW_ONLY,
#     UserRole.VIEWER:      PermissionLevel.VIEW_ONLY,
# }

# def seed_permissions(session):
#     log.info("Seeding default permissions...")
#     _enable_sqlite_foreign_keys(session)

#     for data in DEFAULT_PERMISSIONS:
#         exists = session.query(Permission).filter_by(name=data["name"]).first()
#         if not exists:
#             session.add(Permission(**data))

#     session.commit()
#     log.info("✅ Permissions seeded.")


# def seed_role_permissions(session):
#     log.info("Seeding role → permission mappings...")
#     _enable_sqlite_foreign_keys(session)

#     # Build a map by name for quick lookup
#     perms_by_name = {
#         p.name: p.id for p in session.query(Permission).all()
#     }

#     role_permissions = {
#         UserRole.ADMIN: [p["name"] for p in DEFAULT_PERMISSIONS],  # all
#         UserRole.MANAGER: [
#             "create_document", "read_document", "update_document",
#             "create_audit", "read_audit", "update_audit",
#             "read_user", "update_user",
#             "create_incident", "read_incident", "update_incident"
#         ],
#         UserRole.AUDITOR: [
#             "read_document", "update_document",
#             "create_audit", "read_audit", "update_audit",
#             "read_user",
#             "read_incident", "update_incident"
#         ],
#         UserRole.EMPLOYEE: [
#             "read_document",
#             "read_audit",
#             "create_incident", "read_incident"
#         ],
#         UserRole.VIEWER: [
#             "read_document",
#             "read_audit",
#             "read_incident"
#         ],
#         # SUPER_ADMIN inherits all capabilities
#         UserRole.SUPER_ADMIN: [p["name"] for p in DEFAULT_PERMISSIONS],
#     }

#     # Clear and re-seed
#     session.query(RolePermission).delete()
#     session.commit()

#      for role, names in role_permissions.items():
#         level = ROLE_TO_PERMISSION_LEVEL[role]
#         for perm_name in names:
#             perm_id = perms_by_name.get(perm_name)
#             if not perm_id:
#                 continue
#             rp = RolePermission(
#                 role=role,
#                 permission_level=level,   # <-- REQUIRED (was missing earlier)
#                 permission_id=perm_id
#             )
#             session.add(rp)

#     session.commit()
#     log.info("✅ Role permissions seeded.")

# def ensure_super_admin(session):
#     """Create one default super admin if none exists."""
#     log.info("Ensuring a Super Admin exists...")
#     from models import User  # already imported above; local import OK

#     sa = session.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
#     if sa:
#         log.info("Super Admin already present.")
#         return

#     # Minimal bootstrap user (password is a placeholder—hash in your real auth flow)
#     user = User(
#         email="admin@local.test",
#         username="superadmin",
#         first_name="Super",
#         last_name="Admin",
#         hashed_password="NOT_HASHED_CHANGE_ME",  # replace with your hashing
#         role=UserRole.SUPER_ADMIN,
#         permission_level=PermissionLevel.SUPER_ADMIN,
#         is_active=True,
#         is_verified=True,
#         created_at=datetime.utcnow(),
#     )
#     session.add(user)
#     session.commit()
#     log.info("✅ Default Super Admin created: admin@local.test")

#     def main():
#     # 1) Create tables
#     create_tables()

#     # 2) Seed
#     db = SessionLocal()
#     try:
#         seed_permissions(db)
#         seed_role_permissions(db)
#         ensure_super_admin(db)
#     finally:
#         db.close()

#     log.info("🎉 init_db completed successfully.")


# if __name__ == "__main__":
#     main()


# # Add permissions if they don't exist
# # for perm_data in default_permissions:
# #     existing_perm = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
# #     if not existing_perm:
# #         permission = Permission(**perm_data)
# #         db.add(permission)

# # db.commit()

# # # Create default role permissions
# # role_permissions = {
# #     UserRole.ADMIN: [perm["name"] for perm in default_permissions],  # Admin gets all permissions
# #     UserRole.MANAGER: [
# #         "create_document", "read_document", "update_document",
# #         "create_audit", "read_audit", "update_audit",
# #         "read_user", "update_user",
# #         "create_incident", "read_incident", "update_incident"
# #     ],
# #     UserRole.AUDITOR: [
# #         "read_document", "update_document",
# #         "create_audit", "read_audit", "update_audit",
# #         "read_user",
# #         "read_incident", "update_incident"
# #     ],
# #     UserRole.EMPLOYEE: [
# #         "read_document",
# #         "read_audit",
# #         "create_incident", "read_incident"
# #     ],
# #     UserRole.VIEWER: [
# #         "read_document",
# #         "read_audit",
# #         "read_incident"
# #     ]
# # }

# # Clear existing role permissions and add new ones
# # db.query(RolePermission).delete()
# # db.commit()

# # for role, permission_names in role_permissions.items():
# #     for perm_name in permission_names:
# #         permission = db.query(Permission).filter(Permission.name == perm_name).first()
# #         if permission:
# #             role_perm = RolePermission(role=role, permission_id=permission.id)
# #             db.add(role_perm)

# # db.commit()
# # db.close()

# print("Default permissions and role permissions created successfully!")


# init_db.py
# from __future__ import annotations

# import logging
# from datetime import datetime
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy import text

# from database import Base, DATABASE_URL, engine
# import models  # ensure all model classes are registered with Base

# from models import (
#     User,
#     Permission,
#     RolePermission,
#     UserRole,
#     PermissionLevel,  # <-- needed
# )

# logging.basicConfig(level=logging.INFO)
# log = logging.getLogger("init_db")

# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# # ---- schema creation ---------------------------------------------------------

# def _enable_sqlite_foreign_keys(session):
#     """Enable FK checks for SQLite (no-op for Postgres/MySQL)."""
#     if DATABASE_URL.startswith("sqlite"):
#         session.execute(text("PRAGMA foreign_keys=ON;"))

# def create_tables():
#     log.info("Creating all tables (if missing)...")
#     Base.metadata.create_all(bind=engine)
#     log.info("✅ Tables ready.")

# # ---- seed data ---------------------------------------------------------------

# DEFAULT_PERMISSIONS = [
#     # Document Management
#     {"name": "create_document", "description": "Create new documents", "module": "document", "action": "create"},
#     {"name": "read_document",   "description": "View documents",        "module": "document", "action": "read"},
#     {"name": "update_document", "description": "Edit documents",        "module": "document", "action": "update"},
#     {"name": "delete_document", "description": "Delete documents",      "module": "document", "action": "delete"},

#     # Audit Management
#     {"name": "create_audit", "description": "Create new audits", "module": "audit", "action": "create"},
#     {"name": "read_audit",   "description": "View audits",       "module": "audit", "action": "read"},
#     {"name": "update_audit", "description": "Edit audits",       "module": "audit", "action": "update"},
#     {"name": "delete_audit", "description": "Delete audits",     "module": "audit", "action": "delete"},

#     # User Management
#     {"name": "create_user", "description": "Create new users", "module": "user", "action": "create"},
#     {"name": "read_user",   "description": "View users",       "module": "user", "action": "read"},
#     {"name": "update_user", "description": "Edit users",       "module": "user", "action": "update"},
#     {"name": "delete_user", "description": "Delete users",     "module": "user", "action": "delete"},

#     # Incident Management
#     {"name": "create_incident", "description": "Create incident reports", "module": "incident", "action": "create"},
#     {"name": "read_incident",   "description": "View incident reports",   "module": "incident", "action": "read"},
#     {"name": "update_incident", "description": "Edit incident reports",   "module": "incident", "action": "update"},
#     {"name": "delete_incident", "description": "Delete incident reports", "module": "incident", "action": "delete"},
# ]

# ROLE_TO_PERMISSION_LEVEL = {
#     UserRole.SUPER_ADMIN: PermissionLevel.SUPER_ADMIN,
#     UserRole.ADMIN:       PermissionLevel.ADMIN_ACCESS,
#     UserRole.MANAGER:     PermissionLevel.EDIT_ACCESS,
#     UserRole.AUDITOR:     PermissionLevel.EDIT_ACCESS,  # adjust to VIEW_ONLY if you prefer
#     UserRole.EMPLOYEE:    PermissionLevel.VIEW_ONLY,
#     UserRole.VIEWER:      PermissionLevel.VIEW_ONLY,
# }

# def seed_permissions(session):
#     log.info("Seeding default permissions...")
#     _enable_sqlite_foreign_keys(session)

#     for data in DEFAULT_PERMISSIONS:
#         exists = session.query(Permission).filter_by(name=data["name"]).first()
#         if not exists:
#             session.add(Permission(**data))

#     session.commit()
#     log.info("✅ Permissions seeded.")

# def seed_role_permissions(session):
#     log.info("Seeding role → permission mappings...")
#     _enable_sqlite_foreign_keys(session)

#     # Map permission name → id
#     perms_by_name = {p.name: p.id for p in session.query(Permission).all()}

#     role_permissions = {
#         UserRole.SUPER_ADMIN: [p["name"] for p in DEFAULT_PERMISSIONS],  # everything
#         UserRole.ADMIN:       [p["name"] for p in DEFAULT_PERMISSIONS],  # everything
#         UserRole.MANAGER: [
#             "create_document", "read_document", "update_document",
#             "create_audit",    "read_audit",    "update_audit",
#             "read_user",       "update_user",
#             "create_incident", "read_incident", "update_incident",
#         ],
#         UserRole.AUDITOR: [
#             "read_document", "update_document",
#             "create_audit",  "read_audit", "update_audit",
#             "read_user",
#             "read_incident", "update_incident",
#         ],
#         UserRole.EMPLOYEE: [
#             "read_document",
#             "read_audit",
#             "create_incident", "read_incident",
#         ],
#         UserRole.VIEWER: [
#             "read_document",
#             "read_audit",
#             "read_incident",
#         ],
#     }

#     # Clear and reseed (idempotent)
#     session.query(RolePermission).delete()
#     session.commit()

#     for role, names in role_permissions.items():
#         level = ROLE_TO_PERMISSION_LEVEL[role]
#         for perm_name in names:
#             perm_id = perms_by_name.get(perm_name)
#             if not perm_id:
#                 continue
#             session.add(RolePermission(
#                 role=role,
#                 permission_level=level,   # REQUIRED by your model
#                 permission_id=perm_id,
#             ))

#     session.commit()
#     log.info("✅ Role permissions seeded.")

# def ensure_super_admin(session):
#     """Create a default Super Admin if none exists."""
#     log.info("Ensuring a Super Admin exists...")
#     sa = session.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
#     if sa:
#         log.info("Super Admin already present.")
#         return

#     # NOTE: replace with a **hashed** password in your real auth flow
#     user = User(
#         email="admin@local.test",
#         username="superadmin",
#         first_name="Super",
#         last_name="Admin",
#         hashed_password="NOT_HASHED_CHANGE_ME",
#         role=UserRole.SUPER_ADMIN,
#         permission_level=PermissionLevel.SUPER_ADMIN,
#         is_active=True,
#         is_verified=True,
#         created_at=datetime.utcnow(),
#     )
#     session.add(user)
#     session.commit()
#     log.info("✅ Default Super Admin created: admin@local.test")

# def main():
#     # 1) create tables
#     create_tables()

#     # 2) seed data
#     db = SessionLocal()
#     try:
#         seed_permissions(db)
#         seed_role_permissions(db)
#         ensure_super_admin(db)
#     finally:
#         db.close()

#     log.info("🎉 init_db completed successfully.")

# if __name__ == "__main__":
#     main()



# init_db.py
# from __future__ import annotations

# import logging
# from datetime import datetime
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy import text
# from database import Base, DATABASE_URL, engine
# # Import models to register table mappings with Base
# import models
# from models import (
#     User, Permission, RolePermission, UserRole,
#     CalendarEvent, EventAttendee, EventReminder,
#     Project, TaskDependency, ProjectTask, PermissionLevel,
# )

# logging.basicConfig(level=logging.INFO)
# log = logging.getLogger("init_db")

# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# def _enable_sqlite_foreign_keys(session) -> None:
#     """Enable FK checks for SQLite (no-op for Postgres/MySQL)."""
#     if DATABASE_URL.startswith("sqlite"):
#         session.execute(text("PRAGMA foreign_keys=ON;"))

# def create_tables() -> None:
#     log.info("Creating all tables (if missing)...")
#     Base.metadata.create_all(bind=engine)
#     log.info("✅ Tables ready.")

# # --- Default permissions ---
# DEFAULT_PERMISSIONS = [
#     # Document Management
#     {"name": "create_document", "description": "Create new documents", "module": "document", "action": "create"},
#     {"name": "read_document",   "description": "View documents",       "module": "document", "action": "read"},
#     {"name": "update_document", "description": "Edit documents",       "module": "document", "action": "update"},
#     {"name": "delete_document", "description": "Delete documents",     "module": "document", "action": "delete"},

#     # Audit Management
#     {"name": "create_audit", "description": "Create new audits", "module": "audit", "action": "create"},
#     {"name": "read_audit",   "description": "View audits",       "module": "audit", "action": "read"},
#     {"name": "update_audit", "description": "Edit audits",       "module": "audit", "action": "update"},
#     {"name": "delete_audit", "description": "Delete audits",     "module": "audit", "action": "delete"},

#     # User Management
#     {"name": "create_user", "description": "Create new users", "module": "user", "action": "create"},
#     {"name": "read_user",   "description": "View users",       "module": "user", "action": "read"},
#     {"name": "update_user", "description": "Edit users",       "module": "user", "action": "update"},
#     {"name": "delete_user", "description": "Delete users",     "module": "user", "action": "delete"},

#     # Incident Management
#     {"name": "create_incident", "description": "Create incident reports", "module": "incident", "action": "create"},
#     {"name": "read_incident",   "description": "View incident reports",   "module": "incident", "action": "read"},
#     {"name": "update_incident", "description": "Edit incident reports",   "module": "incident", "action": "update"},
#     {"name": "delete_incident", "description": "Delete incident reports", "module": "incident", "action": "delete"},
# ]

# ROLE_TO_PERMISSION_LEVEL = {
#     UserRole.SUPER_ADMIN: PermissionLevel.SUPER_ADMIN,
#     UserRole.ADMIN:       PermissionLevel.ADMIN_ACCESS,
#     UserRole.MANAGER:     PermissionLevel.EDIT_ACCESS,
#     UserRole.AUDITOR:     PermissionLevel.EDIT_ACCESS,   # adjust if you prefer read-only
#     UserRole.EMPLOYEE:    PermissionLevel.VIEW_ONLY,
#     UserRole.VIEWER:      PermissionLevel.VIEW_ONLY,
# }

# def seed_permissions(session) -> None:
#     log.info("Seeding default permissions...")
#     _enable_sqlite_foreign_keys(session)

#     for data in DEFAULT_PERMISSIONS:
#         exists = session.query(Permission).filter_by(name=data["name"]).first()
#         if not exists:
#             session.add(Permission(**data))

#     session.commit()
#     log.info("✅ Permissions seeded.")

# def seed_role_permissions(session) -> None:
#     log.info("Seeding role → permission mappings...")
#     _enable_sqlite_foreign_keys(session)

#     # Map permission name -> id
#     perms_by_name = {p.name: p.id for p in session.query(Permission).all()}

#     role_permissions = {
#         UserRole.SUPER_ADMIN: [p["name"] for p in DEFAULT_PERMISSIONS],
#         UserRole.ADMIN:       [p["name"] for p in DEFAULT_PERMISSIONS],
#         UserRole.MANAGER: [
#             "create_document", "read_document", "update_document",
#             "create_audit", "read_audit", "update_audit",
#             "read_user", "update_user",
#             "create_incident", "read_incident", "update_incident",
#         ],
#         UserRole.AUDITOR: [
#             "read_document", "update_document",
#             "create_audit", "read_audit", "update_audit",
#             "read_user",
#             "read_incident", "update_incident",
#         ],
#         UserRole.EMPLOYEE: [
#             "read_document",
#             "read_audit",
#             "create_incident", "read_incident",
#         ],
#         UserRole.VIEWER: [
#             "read_document",
#             "read_audit",
#             "read_incident",
#         ],
#     }

#     # Clear and re-seed
#     session.query(RolePermission).delete()
#     session.commit()

#     for role, names in role_permissions.items():
#         level = ROLE_TO_PERMISSION_LEVEL[role]
#         for perm_name in names:
#             perm_id = perms_by_name.get(perm_name)
#             if not perm_id:
#                 continue
#             session.add(RolePermission(
#                 role=role,
#                 permission_level=level,   # REQUIRED field
#                 permission_id=perm_id
#             ))

#     session.commit()
#     log.info("✅ Role permissions seeded.")

# def ensure_super_admin(session) -> None:
#     """Create one default super admin if none exists."""
#     log.info("Ensuring a Super Admin exists...")

#     sa = session.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
#     if sa:
#         log.info("Super Admin already present.")
#         return

#     user = User(
#         email="admin@local.test",
#         username="superadmin",
#         first_name="Super",
#         last_name="Admin",
#         hashed_password="NOT_HASHED_CHANGE_ME",  # replace with a proper hash in your auth flow
#         role=UserRole.SUPER_ADMIN,
#         permission_level=PermissionLevel.SUPER_ADMIN,
#         is_active=True,
#         is_verified=True,
#         created_at=datetime.utcnow(),
#     )
#     session.add(user)
#     session.commit()
#     log.info("✅ Default Super Admin created: admin@local.test")

# def init_db() -> None:
#     # 1) Create tables
#     create_tables()

#     # 2) Seed baseline data
#     db = SessionLocal()
#     try:
#         seed_permissions(db)
#         seed_role_permissions(db)
#         ensure_super_admin(db)
#     finally:
#         db.close()

#     log.info("🎉 init_db completed successfully.")

# if __name__ == "__main__":
#     init_db()


# init_db.py
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, List

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from database import engine, DATABASE_URL, Base
from models import (
    User,
    Permission,
    RolePermission,
    UserRole,
    PermissionLevel,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("init_db")

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# -----------------------------
# Create / migrate
# -----------------------------
def enable_sqlite_fk(session):
    if DATABASE_URL.startswith("sqlite"):
        session.execute(text("PRAGMA foreign_keys=ON;"))

def create_tables():
    log.info("Creating all tables (if missing)...")
    Base.metadata.create_all(bind=engine)
    log.info("✅ Tables ready.")

def ensure_role_permissions_permission_level():
    """
    If the role_permissions table is missing the 'permission_level' column,
    add it (SQLite stores Enum as TEXT).
    """
    with engine.begin() as conn:
        if DATABASE_URL.startswith("sqlite"):
            cols = conn.execute(text("PRAGMA table_info('role_permissions');")).fetchall()
            col_names = {c[1] for c in cols}  # (cid, name, type, notnull, dflt_value, pk)
            if "permission_level" not in col_names:
                log.info("Adding missing column role_permissions.permission_level (SQLite)...")
                conn.execute(
                    text(
                        "ALTER TABLE role_permissions "
                        "ADD COLUMN permission_level VARCHAR(50) NOT NULL DEFAULT 'reader'"
                    )
                )
                log.info("✅ Column added.")
        else:
            # Postgres / others
            exists = conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='role_permissions' AND column_name='permission_level'"
                )
            ).fetchone()
            if not exists:
                log.info("Adding missing column role_permissions.permission_level...")
                conn.execute(text(
                    "ALTER TABLE role_permissions ADD COLUMN permission_level VARCHAR(50) NOT NULL DEFAULT 'reader'"
                ))
                log.info("✅ Column added.")

# -----------------------------
# Seed data
# -----------------------------
default_permissions: List[Dict[str, str]] = [
    # Document Management
    {"name": "create_document", "description": "Create new documents", "module": "document", "action": "create"},
    {"name": "read_document",   "description": "View documents",       "module": "document", "action": "read"},
    {"name": "update_document", "description": "Edit documents",       "module": "document", "action": "update"},
    {"name": "delete_document", "description": "Delete documents",     "module": "document", "action": "delete"},
    # Audit Management
    {"name": "create_audit", "description": "Create new audits", "module": "audit", "action": "create"},
    {"name": "read_audit",   "description": "View audits",       "module": "audit", "action": "read"},
    {"name": "update_audit", "description": "Edit audits",       "module": "audit", "action": "update"},
    {"name": "delete_audit", "description": "Delete audits",     "module": "audit", "action": "delete"},
    # User Management
    {"name": "create_user", "description": "Create new users", "module": "user", "action": "create"},
    {"name": "read_user",   "description": "View users",       "module": "user", "action": "read"},
    {"name": "update_user", "description": "Edit users",       "module": "user", "action": "update"},
    {"name": "delete_user", "description": "Delete users",     "module": "user", "action": "delete"},
    # Incident Management
    {"name": "create_incident", "description": "Create incident reports", "module": "incident", "action": "create"},
    {"name": "read_incident",   "description": "View incident reports",   "module": "incident", "action": "read"},
    {"name": "update_incident", "description": "Edit incident reports",   "module": "incident", "action": "update"},
    {"name": "delete_incident", "description": "Delete incident reports", "module": "incident", "action": "delete"},
]

ROLE_TO_PERMISSION_LEVEL: Dict[UserRole, PermissionLevel] = {
    UserRole.SUPER_ADMIN: PermissionLevel.SUPER_ADMIN,
    UserRole.ADMIN:       PermissionLevel.ADMIN,
    UserRole.MANAGER:     PermissionLevel.REVIEWER,
    UserRole.AUDITOR:     PermissionLevel.REVIEWER,
    UserRole.EMPLOYEE:    PermissionLevel.EDITOR,
    UserRole.VIEWER:      PermissionLevel.READER,
}

def seed_permissions(session):
    log.info("Seeding default permissions...")
    enable_sqlite_fk(session)
    for data in default_permissions:
        if not session.query(Permission).filter_by(name=data["name"]).first():
            session.add(Permission(**data))
    session.commit()
    log.info("✅ Permissions seeded.")

def seed_role_permissions(session):
    log.info("Seeding role → permission mappings...")
    enable_sqlite_fk(session)

    # make sure column exists before inserting rows that reference it
    ensure_role_permissions_permission_level()

    # permissions map
    perms_by_name = {p.name: p.id for p in session.query(Permission).all()}

    role_permissions = {
        UserRole.SUPER_ADMIN: [p["name"] for p in default_permissions],
        UserRole.ADMIN:       [p["name"] for p in default_permissions],
        UserRole.MANAGER: [
            "create_document", "read_document", "update_document",
            "create_audit", "read_audit", "update_audit",
            "read_user", "update_user",
            "create_incident", "read_incident", "update_incident",
        ],
        UserRole.AUDITOR: [
            "read_document", "update_document",
            "create_audit", "read_audit", "update_audit",
            "read_user",
            "read_incident", "update_incident",
        ],
        UserRole.EMPLOYEE: [
            "read_document",
            "read_audit",
            "create_incident", "read_incident",
        ],
        UserRole.VIEWER: [
            "read_document",
            "read_audit",
            "read_incident",
        ],
    }

    # reset and seed
    session.query(RolePermission).delete()
    session.commit()

    for role, perm_names in role_permissions.items():
        level = ROLE_TO_PERMISSION_LEVEL[role]
        for name in perm_names:
            perm_id = perms_by_name.get(name)
            if not perm_id:
                continue
            session.add(RolePermission(role=role, permission_level=level, permission_id=perm_id))

    session.commit()
    log.info("✅ Role permissions seeded.")

def ensure_super_admin(session):
    log.info("Ensuring a Super Admin exists...")
    user = session.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
    if user:
        log.info("Super Admin already present.")
        return
    session.add(
        User(
            email="admin@local.test",
            username="superadmin",
            first_name="Super",
            last_name="Admin",
            hashed_password="NOT_HASHED_CHANGE_ME",  # replace with hashed value in real flows
            role=UserRole.SUPER_ADMIN,
            permission_level=PermissionLevel.SUPER_ADMIN,
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow(),
        )
    )
    session.commit()
    log.info("✅ Default Super Admin created: admin@local.test")

# -----------------------------
# Entrypoint
# -----------------------------
def init_db():
    create_tables()
    # migration guard (safe to call repeatedly)
    ensure_role_permissions_permission_level()

    db = SessionLocal()
    try:
        seed_permissions(db)
        seed_role_permissions(db)
        ensure_super_admin(db)
    finally:
        db.close()
    log.info("🎉 init_db completed successfully.")

if __name__ == "__main__":
    init_db()
