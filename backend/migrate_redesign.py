"""One-time, idempotent development migration for the CampusLoop redesign."""
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = ROOT / "campusloop.db"
BACKUP = ROOT / f"campusloop.pre-redesign-{datetime.now():%Y%m%d-%H%M%S}.db"

if not DB.exists():
    raise SystemExit("No development database found; nothing to migrate.")

shutil.copy2(DB, BACKUP)
connection = sqlite3.connect(DB)
columns = lambda table: {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}

event_columns = {
    "end_date": "DATETIME", "tags": "TEXT NOT NULL DEFAULT ''", "eligibility": "TEXT NOT NULL DEFAULT 'Open to all students'",
    "instructions": "TEXT NOT NULL DEFAULT ''", "contact_details": "VARCHAR(255) NOT NULL DEFAULT ''", "external_link": "VARCHAR(500)",
    "poster_url": "VARCHAR(500)", "banner_url": "VARCHAR(500)", "is_paid": "BOOLEAN NOT NULL DEFAULT 0", "entry_fee_paise": "INTEGER NOT NULL DEFAULT 0",
    "currency": "VARCHAR(3) NOT NULL DEFAULT 'INR'", "is_featured": "BOOLEAN NOT NULL DEFAULT 0", "cancellation_reason": "TEXT", "club_id": "INTEGER", "created_by_id": "INTEGER",
}
for name, definition in event_columns.items():
    if name not in columns("events"): connection.execute(f"ALTER TABLE events ADD COLUMN {name} {definition}")
registration_columns = {
    "status": "VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'", "payment_status": "VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED'",
    "amount_paise": "INTEGER NOT NULL DEFAULT 0", "transaction_reference": "VARCHAR(255)",
}
for name, definition in registration_columns.items():
    if name not in columns("registrations"): connection.execute(f"ALTER TABLE registrations ADD COLUMN {name} {definition}")
connection.execute("UPDATE users SET role='CLUB_ADMIN' WHERE role='ORGANIZER'")
connection.commit(); connection.close()

from app.database import Base, engine
from app import models  # noqa: F401
Base.metadata.create_all(bind=engine)

connection = sqlite3.connect(DB)
organizer = connection.execute("SELECT id,email FROM users WHERE role='CLUB_ADMIN' ORDER BY id LIMIT 1").fetchone()
if organizer:
    club = connection.execute("SELECT id FROM clubs ORDER BY id LIMIT 1").fetchone()
    if not club:
        connection.execute("INSERT INTO clubs (name,slug,description,category,contact_email,faculty_coordinator,student_coordinator,approval_status,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", ("CampusLoop Events Club","campusloop-events-club","Migrated development club","General",organizer[1],"Faculty Coordinator","Student Coordinator","APPROVED",1,datetime.utcnow().isoformat()))
        club = (connection.execute("SELECT last_insert_rowid()").fetchone()[0],)
    connection.execute("INSERT OR IGNORE INTO club_admin_memberships (user_id,club_id,created_at) VALUES (?,?,?)", (organizer[0],club[0],datetime.utcnow().isoformat()))
    connection.execute("UPDATE events SET club_id=?, created_by_id=? WHERE club_id IS NULL", (club[0],organizer[0]))
connection.commit(); connection.close()
print(f"Migration complete. Backup: {BACKUP.name}")
