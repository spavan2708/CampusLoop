# CampusLoop

CampusLoop is a full-stack college event platform for students, approved clubs, and a central campus administrator. The FastAPI API owns authentication, moderation, event ownership, registrations, waitlists, saved events, and notifications. The repository also contains separate Vite entry points for the Student, Club, and Admin portals.

## Features

- Student signup, JWT login, session restoration, event discovery, saved events, registrations, cancellation, and notifications
- Centrally provisioned club accounts, club profiles, draft event creation, moderation, publishing, attendee views, and password changes
- A single bootstrapped central-admin account for club provisioning and event review
- Backend-enforced roles, event ownership, deadlines, capacity, duplicate-registration prevention, and CORS
- Argon2 password hashing, JWT authentication, health checks, and structured notification workflows

## Technology

- API: FastAPI, SQLAlchemy 2, Pydantic, Alembic, Uvicorn
- Databases: SQLite for local development; PostgreSQL with psycopg 3 for production
- Web: React, Vite, Axios, shared npm workspaces
- Hosting target: Render for the API; three separate Vercel projects for the portals

## Repository layout

```text
CampusLoop/
├── apps/
│   ├── student-portal/       # @campusloop/student-portal
│   ├── club-portal/          # @campusloop/club-portal
│   └── admin-portal/         # @campusloop/admin-portal
├── packages/                 # Shared API, UI, types, and utilities
├── backend/
│   ├── alembic/              # Production schema migrations
│   ├── app/                  # FastAPI application
│   ├── tests/                # Backend test suite
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/                 # Existing integrated development UI
├── render.yaml
└── package.json              # npm workspace commands
```

## Local development

Requirements: Python 3.11 or newer, Node.js 20 or newer, and npm.

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Generate a private local `JWT_SECRET` with `openssl rand -hex 32` and put it in `backend/.env`. With `ENVIRONMENT=development` and no `DATABASE_URL`, the API uses `backend/campusloop.db`. Local SQLite tables may be created automatically; production never uses `create_all()`.

The API is available at `http://127.0.0.1:8000`, Swagger documentation at `http://127.0.0.1:8000/docs`, and the database-aware health check at `http://127.0.0.1:8000/health`.

### Portals

Install workspace dependencies once from the repository root:

```bash
npm install
```

Copy the appropriate `.env.example` to `.env` inside each portal and use `VITE_API_URL=http://127.0.0.1:8000` locally. Start a portal with:

```bash
npm run dev:student
npm run dev:club
npm run dev:admin
```

The local ports are 5173, 5174, and 5175 respectively. Each portal reads its own `VITE_API_URL`; tokens and credentials do not belong in Vite environment variables.

## Database migrations

Alembic is the production schema authority. The initial revision is `7a44e2a477d5_initial_schema.py`. It represents the complete current schema, including users, clubs, events, reviews, registrations, saved events, notification tables, enum types, indexes, foreign keys, and unique constraints.

Apply migrations from `backend/`:

```bash
alembic upgrade head
```

The Alembic environment reads `DATABASE_URL` through `app.config.Settings`, including normalization of provider URLs beginning with `postgres://`. Do not run the initial migration against the existing prototype SQLite database: it already contains application tables. The migration is intended for a new managed PostgreSQL database. Existing local SQLite data and the historical data-preserving scripts remain untouched.

## Production environment

### Render variables

Set these on the backend service:

```dotenv
ENVIRONMENT=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
JWT_EXPIRY_MINUTES=60
ALLOWED_FRONTEND_ORIGIN=https://student.example.edu,https://clubs.example.edu,https://admin.example.edu
```

Production startup fails if `DATABASE_URL` is missing, points to SQLite, or if `JWT_SECRET` is missing or uses a known development placeholder. Comma-separated CORS entries must be exact origins; wildcard origins are rejected because authenticated requests use credentials.

### Render service configuration

The checked-in `render.yaml` contains placeholders only. Its effective configuration is:

- Runtime: Python
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Pre-deploy command: `alembic upgrade head`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`
- Auto-deploy: disabled by default in the blueprint

### Vercel configuration

Create three separate Vercel projects from the same repository. Set each project Root Directory to its app directory and enable Vercel's option to include source files outside that directory so npm can resolve the shared workspace packages. Use `cd ../.. && npm install` as the Install Command, `dist` as the Output Directory, and these Build Commands:

| Project | Build command | Output directory |
| --- | --- | --- |
| Student Portal (`apps/student-portal`) | `cd ../.. && npm run build --workspace @campusloop/student-portal` | `dist` |
| Club Portal (`apps/club-portal`) | `cd ../.. && npm run build --workspace @campusloop/club-portal` | `dist` |
| Admin Portal (`apps/admin-portal`) | `cd ../.. && npm run build --workspace @campusloop/admin-portal` | `dist` |

Set this independently in all three projects:

```dotenv
VITE_API_URL=https://your-campusloop-api.onrender.com
```

Each app-local `vercel.json` rewrites `/(.*)` to `/index.html`, so React Router routes survive direct navigation and refreshes.

## Deployment order

1. Create an empty managed PostgreSQL database.
2. Create the Render backend service and configure the five required variables above.
3. Deploy the backend; allow the pre-deploy command to run `alembic upgrade head`.
4. Verify `https://YOUR_BACKEND/health` reports a healthy database connection.
5. Deploy the Student Portal with its own `VITE_API_URL`.
6. Deploy the Club Portal with its own `VITE_API_URL`.
7. Deploy the Admin Portal with its own `VITE_API_URL`.
8. Put all three final Vercel origins, comma-separated, in backend `ALLOWED_FRONTEND_ORIGIN`.
9. Redeploy the backend and test login, role isolation, moderation, registration, and logout in every portal.

## Uploaded media limitation

Local development stores validated image uploads in `backend/uploads`. A normal Render service filesystem is ephemeral, so these files must **not** be considered durable in production and may disappear during deploys, restarts, or instance replacement. `StorageService` provides an interface for a later Cloudinary or S3 implementation, but no external provider or credentials are configured. Before production users rely on posters or club branding, implement durable object storage and return stable public URLs.

## Validation commands

```bash
# Backend
cd backend
source venv/bin/activate
pytest -q
alembic upgrade head

# All npm workspaces
cd ..
npm run lint
npm run build

# Individual portal builds
npm run build --workspace @campusloop/student-portal
npm run build --workspace @campusloop/club-portal
npm run build --workspace @campusloop/admin-portal
```

## Security notes

- Never commit `.env` files, SQLite databases, database backups, uploads, or build output.
- The API never returns password hashes or the JWT signing secret.
- Club ownership and student-only registration restrictions are enforced by the backend, not frontend visibility alone.
- Bootstrap the single central administrator with `backend/create_admin.py`; there is no public admin signup flow.
- CampusLoop is prepared for these hosting targets but does not deploy or create cloud resources automatically.
