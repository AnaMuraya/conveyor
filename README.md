# Conveyor

A reliable, event-driven **AI task platform** built with NestJS. Clients submit
tasks over an HTTP API; the system persists them, and (as it grows) processes
them with an LLM on a background worker, retrying safely on failure while clients
poll for status. The interesting engineering is the **reliability around an
unreliable, rate-limited, expensive LLM dependency** — not the model call itself.

- **Architecture & flow diagrams:** [`docs/architecture.md`](docs/architecture.md)
- **Design decisions (ADRs):** [`docs/adr/`](docs/adr/README.md)

## Tech stack

NestJS · TypeScript · PostgreSQL · TypeORM · OpenAPI/Swagger · Docker.
Queue/worker (Redis · BullMQ) and local LLM inference (Ollama) arrive in later
iterations. Everything runs locally at $0.

## Prerequisites

- **Node ≥ 22.12** (the TypeORM migration CLI loads an ESM-only dependency)
- **Docker** (for local PostgreSQL)

## Getting started

```bash
# 1. install dependencies
npm install

# 2. start PostgreSQL
docker compose up -d

# 3. configure environment
cp .env.example .env        # adjust if needed

# 4. apply the database schema
npm run migration:run

# 5. run the API (watch mode)
npm run start:dev
```

The API listens on **http://localhost:8000** (override with `PORT`).

## API documentation

Interactive OpenAPI/Swagger UI is served once the app is running:

- **Swagger UI:** http://localhost:8000/docs
- **OpenAPI JSON:** http://localhost:8000/docs-json

### Endpoints

| Method & path     | Description                                  |
| ----------------- | -------------------------------------------- |
| `POST /tasks`     | Submit a task; returns it immediately as `pending`. |
| `GET /tasks/:id`  | Fetch a task by id (`400` if malformed, `404` if absent). |

```bash
# submit a task
curl -X POST http://localhost:8000/tasks \
  -H 'Content-Type: application/json' \
  -d '{ "type": "summarize", "payload": { "text": "..." } }'

# poll its status
curl http://localhost:8000/tasks/<id>
```

A task has: `id`, `type`, `payload`, `status` (`pending` / `running` / `done` /
`failed`), `result`, and `createdAt` / `updatedAt`.

## Testing

```bash
npm test          # unit tests — no database required (the repository is mocked)
npm run test:e2e  # e2e tests — require Postgres up + migrations applied
```

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
  tasks/        # TasksModule — POST /tasks, GET /tasks/:id
  llm/          # LlmModule — LlmProvider seam + EchoLlmProvider (stub)
  config/       # data-source.ts — shared TypeORM DataSource
  migrations/   # TypeORM migrations (schema source of truth)
  main.ts       # bootstrap + Swagger setup
docs/
  architecture.md   # living system + flow diagrams (Mermaid)
  adr/              # Architecture Decision Records
docker-compose.yml  # local PostgreSQL
```

## Status

A typed, tested REST API that accepts tasks and persists them in PostgreSQL,
documented with OpenAPI, with an `LlmProvider` adapter seam ready for real
inference. Next: move the LLM call off the request path (queue + worker). See the
[architecture doc](docs/architecture.md) for the current vs. target picture.
