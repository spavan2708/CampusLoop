# CampusLoop

CampusLoop is a full-stack college event-management platform for students, approved clubs, and central campus administrators. It provides one moderated campus calendar while keeping event ownership and registration rules enforced by the API.

## Features

### Students

- Create an account, log in, log out, and restore an authenticated session
- Browse published events and filter by title, category, and date
- View event details, availability, and registration deadlines
- Register for events and cancel registrations
- Join a waitlist when capacity is reached and save events for later
- Browse the directory of approved campus clubs after signing in
- View upcoming and previous registrations

### Club administrators

- Sign in with an account provisioned by the central administrator
- Change the temporary password after signing in
- Create and edit draft events
- Submit events for central review, respond to requested changes, and cancel owned events
- Upload event posters and club branding through validated local media storage
- View event status, capacity, and registration totals
- View attendee names, email addresses, and registration times

### Central administrators

- Create and manage approved club accounts and their initial login credentials
- Approve, reject, request changes, publish, cancel, and feature campus events
- Keep a moderation audit history without exposing public club or administrator signup routes
- Use one centrally bootstrapped administrator account for the installation

### Platform safeguards

- Argon2 password hashing and JWT authentication
- Backend-enforced student and organizer permissions
- Organizer ownership checks for event management and attendee access
- Registration deadline, capacity, and duplicate-registration enforcement
- Integer-paise event fees with payment-state placeholders (no live gateway)
- SQLite foreign-key enforcement
- Environment-backed database, authentication, API, and CORS configuration
- Structured, role-aware in-app notifications with unread counts and user preferences
- Deduplicated reminders, quiet hours, expiration, safe deep links, and cron-friendly jobs

## Technology stack

- Frontend: React, Vite, React Router, Axios, Lucide React
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: SQLite
- Authentication: pwdlib with Argon2 and PyJWT
- Testing and validation: pytest, Oxlint, Vite production build

## Folder structure

```text
CampusLoop/
├── backend/
│   ├── app/
│   │   ├── routers/       # Auth, clubs, events, registrations, moderation, notifications
│   │   ├── jobs/          # Bounded notification generation and delivery commands
│   │   ├── config.py      # Environment-backed settings
│   │   ├── database.py    # SQLAlchemy engine and sessions
│   │   ├── models.py      # Database models and relationships
│   │   ├── schemas.py     # API request and response schemas
│   │   └── main.py        # FastAPI application
│   ├── migrate_redesign.py # Data-preserving prototype schema migration
│   ├── migrate_notifications.py # Additive notification-table migration
│   ├── create_admin.py    # Interactive central-admin bootstrap command
│   └── tests/             # Backend and role workflow tests
├── frontend/
│   ├── public/            # Static browser assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── context/       # Authentication and dashboard state
│       ├── layouts/       # Public and authenticated layouts
│       ├── pages/         # Student, organizer, and public pages
│       ├── services/      # Centralized API calls
│       └── utils/         # Event and date helpers
└── README.md
```

## Environment setup

Requirements: Python 3.11 or newer, Node.js 20 or newer, and npm.

Create the backend environment file:

```bash
cd backend
cp .env.example .env
openssl rand -hex 32
```

Place the generated value in `JWT_SECRET` inside `backend/.env`. Never commit that file. The default database location is `backend/campusloop.db`; leave `DATABASE_URL` unset unless an override is needed.

Create the frontend environment file:

```bash
cd frontend
cp .env.example .env
```

For local development, the expected values are:

```dotenv
# backend/.env
JWT_SECRET=your-private-random-value
JWT_EXPIRY_MINUTES=60
ALLOWED_FRONTEND_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175

# frontend/.env
VITE_API_URL=http://127.0.0.1:8000
```

## Start the backend

Run these commands from `backend/`:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

For an existing pre-redesign development database, stop the API and run the data-preserving migration once. It creates a timestamped backup before changing the schema:

```bash
python migrate_redesign.py
python migrate_notifications.py
```

Create the first central administrator interactively (the password is hidden and is never printed):

```bash
python create_admin.py --name "Campus Admin" --email admin@example.edu
```

## Start the frontend

In a second terminal, run these commands from `frontend/`:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Test and validate

Backend tests, from `backend/`:

```bash
source venv/bin/activate
pytest -q
```

Frontend validation, from `frontend/`:

```bash
npm run lint
npm run build
```

## API documentation

With the backend running, interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

The health endpoint is available at `http://127.0.0.1:8000/health` and performs a database query before reporting a healthy state.

## Notifications and reminders

Notifications are stored per user and cannot be fetched or changed by another account. Business actions create structured notification records and a transactional outbox audit record in the same database transaction. Deterministic keys prevent duplicate registration, waitlist, moderation, milestone, and scheduled-window notifications. Action links are limited to internal student, club, and admin portal paths.

The initial delivery channel is in-app only. Email and push use disabled service interfaces; they send nothing and require a future configured provider and explicit consent. Paid-event notices state that online payment is unavailable and payment reminder generation remains disabled.

The notification lifecycle is `scheduled` → `delivered` → `read`; jobs may instead mark obsolete records `cancelled`, `expired`, or `failed`. Essential cancellation and registration-status notifications cannot be suppressed. Other categories, digest frequency, timezone, and quiet hours are configurable from each portal’s notification preferences page.

Run each bounded job manually or from cron/background infrastructure. None starts an endless process:

```bash
cd backend
python -m app.jobs.generate_notifications
python -m app.jobs.deliver_notifications
python -m app.jobs.expire_notifications
python -m app.jobs.process_outbox
```

Generation rechecks event publication, deadlines, saved/registration state, cancellation, capacity, and deduplication windows. Delivery rechecks expiration and cancellation. Recommended production operation is one generator schedule plus one delivery worker schedule; SQLite is suitable for this learning prototype, while a production multi-worker deployment should use a database with row-level locking.

Important history is retained. Dismissing a notification archives it only for its owner. Messages and response schemas exclude password hashes, tokens, provider credentials, and attendee lists.

## Development notes

- Run the backend and frontend in separate terminals.
- Local `.env` files, SQLite databases, virtual environments, dependencies, build output, and caches are ignored by Git.
- Club-event publication is a two-step central workflow: approve, then publish.
- Paid-event records and UI states are present, but online payments are intentionally disabled until a real gateway is configured.
- This learning prototype uses a data-preserving migration script and does not yet use Alembic.
- CampusLoop has not been deployed; production hosting and production secret management remain future work.
