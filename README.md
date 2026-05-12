# TaskTracker

TaskTracker is a full-stack task and project management app built with Express and PostgreSQL.

## Requirements

- Node.js 18+
- PostgreSQL 14+

## Setup

1. Copy `.env.example` to `.env`.
2. Update the database credentials and session secret in `.env`.
3. Install dependencies:
   `npm install`
4. Run the baseline migration:
   `npm run migrate`
5. Optionally load development data:
   `npm run seed:dev`
6. Start the server:
   `npm start`

## Scripts

- `npm start` - run the backend server
- `npm run dev` - run with nodemon
- `npm test` - run the Node.js test runner
- `npm run migrate` - apply pending database migrations
- `npm run migrate:status` - inspect migration status
- `npm run seed:dev` - load development seed data

## Security Notes

- Do not commit `.env`.
- Rotate any previously committed credentials.
- Set a long random `SESSION_SECRET` before deploying.

## Current API Base

The frontend uses the same-origin API path `/api`.

## CSRF Protection

- The app now uses a double-submit CSRF token for cookie-authenticated write requests.
- After login or registration, the server sets `session` and `csrf_token` cookies.
- Browser clients must send the `X-CSRF-Token` header with the value from the `csrf_token` cookie for `POST`, `PUT`, `PATCH`, and `DELETE` requests.
- The built-in frontend API client in `frontend/src/services/api.js` adds this header automatically.

## API Documentation

- OpenAPI JSON: `/api/docs/openapi.json`
- Human-readable docs page: `/api/docs`
- The current spec covers the core auth, project, task, user, and health routes.

## Database Migrations

- Migration files live in `backend/migrations`
- Apply pending migrations: `npm run migrate`
- Check migration status: `npm run migrate:status`
- The initial baseline migration is `backend/migrations/001_initial_schema.sql`
- Do not edit an already-applied migration; create a new numbered file instead.

## CI

- GitHub Actions workflow: .github/workflows/ci.yml
- CI boots PostgreSQL, runs `npm run migrate`, then runs `npm test`
- The workflow currently uses a temporary local CI database password inside the job definition; production secrets must still stay in environment-specific secret storage.

## Docker

- Dockerfile: `Dockerfile`
- Compose stack: `docker-compose.yml`
- Start app + PostgreSQL: `docker compose up --build`
- The app container runs pending migrations automatically before starting the server.
- For real deployments, replace the compose `SESSION_SECRET` and database password with secure values.

## Logging

- The backend now emits lightweight structured JSON logs for server startup, request completion, and request errors.
- Each request receives an `X-Request-Id` response header for correlation.
- Sensitive headers such as cookies, authorization, and CSRF tokens are intentionally excluded from log metadata.

## Health Checks

- Liveness: `/api/health/live`
- Readiness: `/api/health/ready`
- Legacy combined health endpoint: `/api/health`
- The readiness endpoint verifies PostgreSQL connectivity before returning success.

## Development Seed

- Seed SQL lives in `backend/seeds/dev_seed.sql`
- Apply the dev seed after migrations: `npm run seed:dev`
- Default seeded login examples include `admin@tasktracker.local` with password `Admin@123`
- The seed is intended for local development only and should not be used in production.

## Metrics

- Basic in-process request metrics endpoint: `/api/metrics`
- The metrics snapshot currently includes request counts and average duration grouped by method, route, and status code.
- This is a lightweight built-in view suitable for development and simple operational checks; it is not a full Prometheus exporter.

## Deployment Runbook

### Local Node.js Flow

1. Install dependencies:
   `npm install`
2. Configure `.env` from `.env.example`.
3. Apply migrations:
   `npm run migrate`
4. Optionally seed development data:
   `npm run seed:dev`
5. Start the app:
   `npm start`

### Local Docker Flow

1. Review `docker-compose.yml` and replace placeholder secrets for anything beyond throwaway local use.
2. Start the stack:
   `docker compose up --build`
3. App will wait for PostgreSQL and run migrations automatically before serving traffic.
4. Application URL:
   `http://localhost:8080`

### CI Flow

- GitHub Actions workflow: `.github/workflows/ci.yml`
- CI provisions PostgreSQL, runs migrations, then runs the full test suite.
- Any schema or runtime change should keep `npm test` green locally before pushing.

### Production-Like Environment Checklist

- Set secure values for:
  - `DB_PASSWORD`
  - `SESSION_SECRET`
  - `CORS_ORIGIN`
- Run migrations before or during deploy:
  - `npm run migrate`
- Start the server only after readiness dependencies are available.
- Use health endpoints for orchestration:
  - liveness: `/api/health/live`
  - readiness: `/api/health/ready`
- Use logs and metrics for basic runtime visibility:
  - logs include `X-Request-Id` correlation
  - metrics endpoint: `/api/metrics`

### Post-Deploy Smoke Checks

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/docs/openapi.json`
- Browser check for `/app/`
- Authentication flow check with a non-production test user

## Repository Notes

- The active frontend page set uses the `*Page.html` files in `frontend/src/pages`.
- Obvious legacy lowercase pages and the old `frontend/public/tasktracker-static` demo bundle have been removed to reduce maintenance noise.
