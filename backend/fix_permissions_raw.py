from sqlalchemy import text
from database import engine

# Normalize legacy/uppercase values to the correct enum strings
# Maps both role-like and legacy values to the new PermissionLevel values
UPDATES = [
    ("reader", ("VIEW_ONLY", "READER", "view_only", "link_access", "LINK_ACCESS")),
    ("editor", ("EDITOR", "edit_access", "EDIT_ACCESS")),
    ("reviewer", ("REVIEWER",)),
    ("admin", ("ADMIN", "admin_access", "ADMIN_ACCESS")),
    ("super_admin", ("SUPER_ADMIN",)),
]

with engine.begin() as conn:
    # Show distinct values before
    try:
        before = conn.execute(text("SELECT DISTINCT permission_level FROM users")).fetchall()
        print("Before:", [row[0] for row in before])
    except Exception as e:
        print("Note: Could not list distinct values before update:", e)

    total = 0
    for new_val, olds in UPDATES:
        q = text(
            "UPDATE users SET permission_level = :new_val "
            "WHERE permission_level IN :olds"
        )
        # SQLAlchemy 2.0 needs tuple param for IN
        res = conn.execute(q, {"new_val": new_val, "olds": tuple(olds)})
        total += res.rowcount or 0

    print(f"✅ Updated {total} row(s).")

    # Show distinct values after
    try:
        after = conn.execute(text("SELECT DISTINCT permission_level FROM users")).fetchall()
        print("After:", [row[0] for row in after])
    except Exception as e:
        print("Note: Could not list distinct values after update:", e)
