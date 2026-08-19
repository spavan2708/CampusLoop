# CampusLoop

CampusLoop is a full-stack college event-management platform. Students can discover and register for campus events, while organizers can create, publish, manage, and monitor their events.

## Features

### Students

- Create an account, log in, log out, and restore an authenticated session
- Browse published events and filter by title, category, and date
- View event details, availability, and registration deadlines
- Register for events and cancel registrations
- View upcoming and previous registrations

### Organizers

- Create an organizer account and access role-protected pages
- Create and edit draft events
- Publish or cancel owned events
- View event status, capacity, and registration totals
- View attendee names, email addresses, and registration times

### Platform safeguards

- Argon2 password hashing and JWT authentication
- Backend-enforced student and organizer permissions
- Organizer ownership checks for event management and attendee access
- Registration deadline, capacity, and duplicate-registration enforcement
- SQLite foreign-key enforcement
- Environment-backed database, authentication, API, and CORS configuration

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
│   │   ├── routers/       # Authentication, event, and registration endpoints
│   │   ├── config.py      # Environment-backed settings
│   │   ├── database.py    # SQLAlchemy engine and sessions
│   │   ├── models.py      # Database models and relationships
│   │   ├── schemas.py     # API request and response schemas
│   │   └── main.py        # FastAPI application
│   └── tests/             # Backend and workflow tests
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
ALLOWED_FRONTEND_ORIGIN=http://localhost:5173

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

## Development notes

- Run the backend and frontend in separate terminals.
- Local `.env` files, SQLite databases, virtual environments, dependencies, build output, and caches are ignored by Git.
- This learning prototype creates tables directly and does not yet use Alembic migrations.
- CampusLoop has not been deployed; production hosting and production secret management remain future work.
