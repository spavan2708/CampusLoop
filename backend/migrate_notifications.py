"""Add notification tables to an existing CampusLoop development database.

The migration is additive and idempotent. It creates a timestamped backup before
touching an existing SQLite database and never deletes application data.
"""
from datetime import datetime
from pathlib import Path
import shutil

from app.config import BACKEND_DIR
from app.database import Base, engine
from app import models  # noqa: F401


def main() -> None:
    database_path = BACKEND_DIR / "campusloop.db"
    if database_path.exists():
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = Path(f"{database_path}.notifications-{stamp}.bak")
        shutil.copy2(database_path, backup)
        print(f"Backup created: {backup.name}")
    Base.metadata.create_all(bind=engine)
    print("Notification tables are ready. Existing CampusLoop data was preserved.")


if __name__ == "__main__":
    main()
