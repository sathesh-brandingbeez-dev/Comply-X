from sqlalchemy import create_engine
from database import Base, DATABASE_URL
from models import User, Permission, RolePermission, UserRole

# Create tables
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")

# Create default permissions
from sqlalchemy.orm import sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Define default permissions
default_permissions = [
    # Document Management
    {"name": "create_document", "description": "Create new documents", "module": "document", "action": "create"},
    {"name": "read_document", "description": "View documents", "module": "document", "action": "read"},
    {"name": "update_document", "description": "Edit documents", "module": "document", "action": "update"},
    {"name": "delete_document", "description": "Delete documents", "module": "document", "action": "delete"},
    
    # Audit Management
    {"name": "create_audit", "description": "Create new audits", "module": "audit", "action": "create"},
    {"name": "read_audit", "description": "View audits", "module": "audit", "action": "read"},
    {"name": "update_audit", "description": "Edit audits", "module": "audit", "action": "update"},
    {"name": "delete_audit", "description": "Delete audits", "module": "audit", "action": "delete"},
    
    # User Management
    {"name": "create_user", "description": "Create new users", "module": "user", "action": "create"},
    {"name": "read_user", "description": "View users", "module": "user", "action": "read"},
    {"name": "update_user", "description": "Edit users", "module": "user", "action": "update"},
    {"name": "delete_user", "description": "Delete users", "module": "user", "action": "delete"},
    
    # Incident Management
    {"name": "create_incident", "description": "Create incident reports", "module": "incident", "action": "create"},
    {"name": "read_incident", "description": "View incident reports", "module": "incident", "action": "read"},
    {"name": "update_incident", "description": "Edit incident reports", "module": "incident", "action": "update"},
    {"name": "delete_incident", "description": "Delete incident reports", "module": "incident", "action": "delete"},
]

# Add permissions if they don't exist
for perm_data in default_permissions:
    existing_perm = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
    if not existing_perm:
        permission = Permission(**perm_data)
        db.add(permission)

db.commit()

# Create default role permissions
role_permissions = {
    UserRole.ADMIN: [perm["name"] for perm in default_permissions],  # Admin gets all permissions
    UserRole.MANAGER: [
        "create_document", "read_document", "update_document",
        "create_audit", "read_audit", "update_audit",
        "read_user", "update_user",
        "create_incident", "read_incident", "update_incident"
    ],
    UserRole.AUDITOR: [
        "read_document", "update_document",
        "create_audit", "read_audit", "update_audit",
        "read_user",
        "read_incident", "update_incident"
    ],
    UserRole.EMPLOYEE: [
        "read_document",
        "read_audit",
        "create_incident", "read_incident"
    ],
    UserRole.VIEWER: [
        "read_document",
        "read_audit",
        "read_incident"
    ]
}

# Clear existing role permissions and add new ones
db.query(RolePermission).delete()
db.commit()

for role, permission_names in role_permissions.items():
    for perm_name in permission_names:
        permission = db.query(Permission).filter(Permission.name == perm_name).first()
        if permission:
            role_perm = RolePermission(role=role, permission_id=permission.id)
            db.add(role_perm)

db.commit()
db.close()

print("Default permissions and role permissions created successfully!")