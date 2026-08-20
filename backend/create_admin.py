"""Create or update the first central administrator without exposing a public signup route."""

import argparse
import getpass

from app.database import SessionLocal
from app.models import User, UserRole
from app.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a CampusLoop central administrator")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass.getpass("Admin password (8+ characters): ")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters")

    email = args.email.strip().lower()
    with SessionLocal() as db:
        existing_admin = db.query(User).filter(User.role == UserRole.CENTRAL_ADMIN).first()
        if existing_admin and existing_admin.email != email:
            raise SystemExit("A central administrator already exists. Use that single administrator login.")
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(name=args.name.strip(), email=email, password_hash=hash_password(password))
            db.add(user)
        user.name = args.name.strip()
        user.password_hash = hash_password(password)
        user.role = UserRole.CENTRAL_ADMIN
        user.is_active = True
        db.commit()
    print("Central administrator is ready.")


if __name__ == "__main__":
    main()
