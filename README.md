# Conveyor

A reliable, event-driven **AI task platform** built with NestJS. Clients submit
tasks over an HTTP API; the system persists them, and (as it grows) processes
them with an LLM on a background worker, retrying safely on failure while clients
poll for status. The interesting engineering is the **reliability around an
unreliable, rate-limited, expensive LLM dependency** — not the model call itself.

- **Architecture & flow diagrams:** [`docs/architecture.md`](docs/architecture.md)
- **Design decisions (ADRs):** [`docs/adr/`](docs/adr/README.md)

## Tech stack

NestJS · TypeScript · PostgreSQL · TypeORM · Redis · BullMQ · Passport/JWT ·
OpenAPI/Swagger · Docker. Tasks are processed asynchronously by a separate
worker, behind JWT authentication; local LLM inference (Ollama) drops in behind
the existing provider seam in a later iteration. Everything runs locally at $0.

## Prerequisites

- **Node ≥ 22.12** (the TypeORM migration CLI loads an ESM-only dependency)
- **Docker** (for local PostgreSQL + Redis)

## Getting started

```bash
# 1. install dependencies
npm install

# 2. start PostgreSQL + Redis
docker compose up -d

# 3. configure environment
cp .env.example .env        # adjust if needed

# 4. apply the database schema
npm run migration:run

# 5. run the API (watch mode)
npm run start:dev

# 6. in a second terminal, run the worker (watch mode)
npm run start:worker:dev
```

The API listens on **http://localhost:8000** (override with `PORT`). The worker
has no HTTP surface — it consumes the queue and processes tasks.

## How it works

`POST /tasks` persists the task as `pending` and enqueues a job, then returns
immediately. A **separate worker process** consumes the BullMQ queue and runs the
task through the LLM provider, writing the result back to Postgres. This keeps
the slow LLM call off the request path, and means you can kill the worker while
the API keeps accepting tasks — the worker drains the backlog when it restarts.
Processing is idempotent (a redelivered job won't double-process) and retries
with backoff before a task is marked `failed`. See
[`docs/architecture.md`](docs/architecture.md) and
[ADR-0007](docs/adr/0007-process-tasks-on-a-queue-backed-worker.md).

Requests are authenticated with self-issued JWTs: a global guard protects every
route bar `/health` and `/auth`, so the API is secure by default, and tasks are
scoped to the user who created them
([ADR-0009](docs/adr/0009-authenticate-with-self-issued-jwts-via-passport.md)).

> Tip: set `ECHO_LATENCY_MS=2000` for the worker to make a task linger in
> `running` long enough to watch it transition as you poll.

## API documentation

Interactive OpenAPI/Swagger UI is served once the app is running:

- **Swagger UI:** http://localhost:8000/docs
- **OpenAPI JSON:** http://localhost:8000/docs-json

### Endpoints

| Method & path        | Description                                  |
| -------------------- | -------------------------------------------- |
| `POST /auth/register`| Create a user; returns a bearer token. |
| `POST /auth/login`   | Exchange credentials for a bearer token. |
| `POST /tasks`        | Submit a task; returns it immediately as `pending`. **Auth required.** |
| `GET /tasks/:id`     | Fetch your task by id (`401` unauthenticated, `400` malformed, `404` absent/not yours). |
| `GET /health`        | Liveness probe (public). |

The task endpoints are protected by a JWT (ADR-0009): register or log in for a
token, then send it as `Authorization: Bearer <token>`. Tasks are owned by their
creator — you only see your own (an `admin` sees all).

```bash
# register (or log in) to get a token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{ "username": "ana", "password": "a-strong-pass" }' | jq -r .accessToken)

# submit a task
curl -X POST http://localhost:8000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{ "type": "summarize", "payload": { "text": "..." } }'

# poll its status
curl http://localhost:8000/tasks/<id> -H "Authorization: Bearer $TOKEN"
```

A task has: `id`, `type`, `payload`, `status` (`pending` / `running` / `done` /
`failed`), `result`, `ownerId`, and `createdAt` / `updatedAt`.

## Testing

```bash
npm test          # unit tests — no Postgres/Redis (repository, queue, LLM are mocked)
npm run test:e2e  # e2e tests — require Postgres + Redis up + migrations applied
```

Unit tests cover the failure paths that matter — a redelivered job is skipped
(no double-processing), a task is marked `failed` only after retries are
exhausted, and a task is hidden from non-owners. `processing.e2e-spec.ts` runs a
real queue round-trip end to end; `auth.e2e-spec.ts` covers register/login and
the `401`/ownership gates.

A **pre-push git hook** (managed by [lefthook](https://lefthook.dev)) runs
`lint`, `test`, and `build` before every push, so broken code never reaches
GitHub; the full suite incl. e2e runs in CI. It installs automatically on
`npm install`; bypass with `git push --no-verify` if you must.

## Database migrations

The schema is owned by migrations (`synchronize` is off). Migrations are
hand-written under `src/migrations/`; the shared `DataSource` lives in
`src/config/data-source.ts`.

```bash
npm run migration:run                       # apply pending migrations
npm run migration:revert                    # roll back the most recent
npm run migration:generate -- src/migrations/<Name>   # diff entities → migration
npm run migration:create   -- src/migrations/<Name>   # empty migration
```

## Project structure

```
src/
  tasks/        # producer: controller + service (enqueues)
                # consumer: task.processor.ts + tasks-processing.module.ts (worker-only)
  auth/         # AuthModule — JWT strategy, global guards, decorators
  users/        # UsersModule — User entity + service
  llm/          # LlmModule — LlmProvider seam + EchoLlmProvider (stub)
  config/       # data-source.ts (TypeORM), redis.ts, auth.ts (JWT settings)
  migrations/   # TypeORM migrations (schema source of truth)
  main.ts       # API entrypoint (HTTP + Swagger)
  worker.ts     # worker entrypoint (queue consumer, no HTTP)
docs/
  architecture.md   # living system + flow diagrams (Mermaid)
  adr/              # Architecture Decision Records
docker-compose.yml  # local PostgreSQL + Redis
```

## Status

A typed, tested platform that accepts tasks over HTTP behind **JWT auth**
(per-user ownership + roles), persists them in PostgreSQL, and processes them
asynchronously on a **separate worker** via a **Redis/BullMQ** queue — keeping the
LLM call off the request path, with idempotent processing and retry-then-fail.
Documented with OpenAPI; the `LlmProvider` seam is ready to swap the echo stub for
real inference (Ollama). Next: real inference and/or a dead-letter queue for
poison jobs. See the [architecture doc](docs/architecture.md) for the current vs.
target picture.
