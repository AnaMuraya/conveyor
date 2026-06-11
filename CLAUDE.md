# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository. Keep this file
current — update it whenever structure, conventions, or workflow change.

## What this is

**Conveyor** — a reliable, event-driven AI task platform built on NestJS. Clients
submit jobs via an API; the system queues them; workers process them with an LLM;
failures retry safely; clients poll status. The reliability engineering around an
unreliable, rate-limited, expensive LLM dependency is the point — not the LLM call
itself.

**Target:** an event-driven, multi-service platform that keeps working when a
worker dies and catches up afterwards (`v0.2`), backed by strong docs. Security,
caching, observability, containerization, and deployment (`v1.0`) build on top.

## Stack

NestJS · TypeScript · PostgreSQL · Redis · BullMQ · Ollama · Docker.
Everything runs locally at $0 (local Ollama for inference). Requires
**Node ≥ 22.12** (see `engines`).

## Commands

```bash
docker compose up -d   # start PostgreSQL + Redis locally
cp .env.example .env   # then set DB credentials
npm run migration:run  # apply migrations to the database

npm run start:dev        # run the API with watch
npm run start:worker:dev # run the worker with watch (separate process)
npm run lint             # eslint (autofix)
npm test                 # unit tests (Jest, *.spec.ts under src/) — no DB/Redis
npm run test:e2e         # e2e tests (test/*.e2e-spec.ts) — needs DB + Redis + migrations
npm run build            # nest build -> dist/
```

The **API and worker are two processes** sharing one codebase: the API
(`main.ts`) accepts and enqueues tasks; the worker (`worker.ts`) consumes the
BullMQ queue and runs the LLM call off the request path (ADR-0007). Run both in
dev. Set `ECHO_LATENCY_MS` to make a task linger in `running` long enough to
observe the async flow.

API docs: once running, Swagger UI is at http://localhost:8000/docs and the raw
OpenAPI spec at `/docs-json` (configured in `main.ts`; endpoints/DTO/entity carry
`@nestjs/swagger` decorators — ADR-0006).

Migrations use the TypeORM CLI: `migration:run`, `migration:revert`,
`migration:generate -- <path>` (diff entities → a new migration), and
`migration:create -- <path>`. The CLI loads an ESM-only yargs, so the project
requires **Node ≥ 22.12** (enforced via `engines`; CI runs Node 22). Schema is
owned by migrations (`synchronize: false`); the shared `DataSource` lives in
`src/config/data-source.ts`.

CI (`.github/workflows/ci.yml`) spins up a Postgres service, then runs
lint → unit → migrations → e2e → build on push to `main` and on every PR. Keep
it green.

A **pre-push git hook** (lefthook, `lefthook.yml`) is the local pre-PR gate: it
runs `lint`, `test`, and `build` (the DB-free checks) before any push leaves the
machine, so obviously-broken code never reaches GitHub. The full suite —
migrations + e2e against a real Postgres — stays in CI, which is the
authoritative gate. The hook installs itself via the `prepare` npm script (run
on `npm install`); bypass in a pinch with `git push --no-verify`.

## Architecture & conventions

- **Modular NestJS + DI.** Each feature is a module owning its controller(s) and
  provider(s); modules collaborate through exported providers and DI tokens, not
  by importing concrete classes (ADR-0002).
- **Adapter seams.** External dependencies sit behind interfaces. The
  `LlmProvider` interface (`src/llm/`) is bound to a concrete provider in
  `LlmModule` via the `LLM_PROVIDER` token; swapping Echo → Ollama → hosted is a
  one-line change, never a caller change (ADR-0003).
- **TypeScript contracts first.** DTOs, entities, and interfaces give
  compile-time guarantees; broad runtime validation (class-validator) comes
  later, though id params are already UUID-validated.
- **Persistence behind the service.** `TasksService` depends on a TypeORM
  `Repository<Task>`; callers stay ORM-agnostic. Schema changes go through
  migrations, never `synchronize` (ADR-0005).
- **Failure-path tests are the headline.** "duplicate delivery doesn't
  double-process" / "unknown id → 404" matter more than happy-path CRUD.
- **Earn every pattern.** No saga without genuine multi-step work; a circuit
  breaker exists only because the model provider is genuinely flaky. Be able to
  say why a pattern was skipped.

### Repository layout

```
src/
  tasks/        # TasksModule (producer: controller + service, enqueues jobs)
                #   tasks-processing.module.ts + task.processor.ts (consumer: worker-only)
                #   tasks.constants.ts (queue name, job shape)
  llm/          # LlmModule — LlmProvider seam + EchoLlmProvider
  config/       # data-source.ts (TypeORM DataSource), redis.ts (BullMQ connection)
  migrations/   # TypeORM migrations (schema source of truth)
  app.module.ts # API composition root (HTTP)        → main.ts
  worker.module.ts # worker composition root (no HTTP) → worker.ts
docs/architecture.md  # living system + flow diagrams (Mermaid)
docs/adr/             # Architecture Decision Records (see below)
docker-compose.yml    # local PostgreSQL + Redis
.github/workflows/ci.yml
test/           # e2e specs (incl. processing.e2e-spec.ts — queue round-trip)
```

The producer/consumer split is deliberate: the BullMQ worker is created only in
the worker process (it imports `TasksProcessingModule`); the API never consumes.
Keep the processor out of `AppModule`.

## Architecture diagrams

[`docs/architecture.md`](docs/architecture.md) holds the **living** system and
request-flow diagrams (Mermaid). It always reflects the current state, with a
labelled sketch of the target. Update it as structure or flows change — solid
lines are built, dashed are planned. Whole-system diagrams live there, not in
ADRs (which are immutable); an ADR may embed one small diagram scoped to its own
decision.

## Decisions: ADRs

Design decisions are recorded as **ADRs** — one Markdown file per decision under
`docs/adr/` — written when the decision is made, while the reasoning is fresh. To
add one, copy `docs/adr/template.md` to the next `NNNN-title.md`, fill it in, and
add a row to `docs/adr/README.md`.

## Git & commit policy

- **Always ask before committing.** Never commit unprompted.
- **Never push.** Pushing is the user's call.
- **Do not add a `Co-Authored-By` / "co-authored" trailer** to commit messages.
- **Feature branches.** Work lands on its own feature branch named for the work
  itself (e.g. `feat/tasks-api`); `main` holds the baseline and merged work.

## Current status

Tasks API (`POST /tasks`, `GET /tasks/:id`) backed by **PostgreSQL via TypeORM**
(migrations as the schema source of truth) and **documented with OpenAPI/Swagger**
at `/docs`. The LLM call now runs **off the request path**: `POST /tasks`
persists `pending` and enqueues a **BullMQ** job; a **separate worker process**
consumes it and runs the `LlmProvider` (`EchoLlmProvider` stub), with idempotent
processing and retry-then-fail (ADR-0007). CI runs against Postgres + Redis
services. ADRs 0001–0007 are in place. Next up: real inference (Ollama behind the
seam) and/or a dead-letter queue for poison jobs.
