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
docker compose up -d  # start PostgreSQL locally
cp .env.example .env  # then set DB credentials
npm run migration:run # apply migrations to the database

npm run start:dev     # run with watch
npm run lint          # eslint (autofix)
npm test              # unit tests (Jest, *.spec.ts under src/) — no DB needed
npm run test:e2e      # e2e tests (test/*.e2e-spec.ts) — needs DB + migrations
npm run build         # nest build -> dist/
```

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
  tasks/        # TasksModule — POST /tasks, GET /tasks/:id (Postgres via TypeORM)
  llm/          # LlmModule — LlmProvider seam + EchoLlmProvider
  config/       # data-source.ts — shared TypeORM DataSource (app + CLI)
  migrations/   # TypeORM migrations (schema source of truth)
  app.module.ts # composes feature modules
docs/architecture.md  # living system + flow diagrams (Mermaid)
docs/adr/             # Architecture Decision Records (see below)
docker-compose.yml    # local PostgreSQL
.github/workflows/ci.yml
test/           # e2e specs
```

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
at `/docs`, plus an `LlmProvider` adapter seam with an echo stub
(`EchoLlmProvider`). CI runs against a Postgres service. ADRs 0001–0006 are in
place. Next up: move the LLM call off the request path (queue + worker).
