# 0005. Persist tasks in PostgreSQL via TypeORM

- **Status:** Accepted
- **Date:** 2026-06-09
- **Supersedes:** [ADR-0004](0004-in-memory-task-store.md)

## Context

The in-memory `Map` (ADR-0004) was always a placeholder: state is lost on
restart and not shared across processes. The next steps — a worker that runs the
LLM call off the request path — require storage that **survives restarts and is
shared between the API and the worker**. That means a real database, and an ORM
to map the `Task` entity, model the schema, and manage migrations.

## Decision

Persist tasks in **PostgreSQL**, accessed through **TypeORM**.

- `Task` becomes a TypeORM `@Entity` (`tasks` table): `id` uuid PK,
  `type` varchar, `payload` `jsonb`, `status` as a Postgres `enum`, `result`
  nullable text, and `createdAt`/`updatedAt` timestamps.
- `TasksService` depends on an injected `Repository<Task>` instead of the `Map`;
  its public methods are unchanged (now async), so the controller and DTO are
  untouched.
- The **schema is owned by migrations** (`synchronize: false`). A single
  `DataSource` config (`src/config/data-source.ts`) is shared by the Nest app
  and the TypeORM CLI.
- Postgres runs locally via Docker (`docker-compose.yml`); CI runs the suite
  against a Postgres service container after applying migrations.

## Consequences

- Tasks now durable and shareable — the prerequisite for the worker split.
- A real migration workflow via the TypeORM CLI (`migration:run` / `revert` /
  `generate` / `create`); the schema has a reviewable history. The CLI loads an
  ESM-only yargs, so the project requires **Node ≥ 22.12** (enforced via
  `engines`; CI runs Node 22).
- Local dev and CI need a database; e2e tests run against real Postgres rather
  than an in-memory fake (unit tests still mock the repository).
- The entity is now coupled to TypeORM decorators. Acceptable: the repository
  sits behind `TasksService`, so callers stay ORM-agnostic.
- `GET /tasks/:id` now validates the id as a UUID (`ParseUUIDPipe`) — a
  malformed id is a `400`, a well-formed but absent id is a `404`.

## Alternatives considered

- **Prisma:** excellent type-safety and DX, but its client sits outside Nest's
  DI/repository idioms (you wrap a `PrismaService`), and a goal here is to
  practice the repository pattern directly. TypeORM is the more Nest-native fit.
- **Stay in-memory:** rejected — it cannot back a multi-process, restart-safe
  system, which is the whole point of the next phase.
