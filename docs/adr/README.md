# Architecture Decision Records (ADRs)

This project captures design decisions as **ADRs** — one Markdown file per
decision. Each record is small, immutable once accepted, and written when the
decision is made, while the reasoning is fresh. Together they document why the
system is built the way it is.

## Why ADRs

A file-per-decision log keeps each call atomic: it has its own context, status,
and consequences, can be linked to and superseded individually, and reviews
cleanly in a PR. See [0001](0001-record-architecture-decisions-in-adrs.md).

## How to add one

1. Copy [`template.md`](template.md) to `NNNN-short-title.md` (next number).
2. Fill in Context → Decision → Consequences. Keep it short.
3. Set the status. New records are usually `Accepted`.
4. If it replaces an older decision, set the old one's status to
   `Superseded by ADR-NNNN` and link both ways.
5. Add a row to the index below.

A decision to **not** adopt a pattern is worth recording too — knowing why a
saga or a circuit breaker was skipped is as valuable as knowing why one was added.

## Index

| ADR | Title | Status |
| --- | ----- | ------ |
| [0001](0001-record-architecture-decisions-in-adrs.md) | Record architecture decisions as ADRs | Accepted |
| [0002](0002-nestjs-typescript-modular-architecture.md) | NestJS + TypeScript with a modular architecture | Accepted |
| [0003](0003-llmprovider-adapter-seam.md) | LLM access behind a provider adapter seam | Accepted |
| [0004](0004-in-memory-task-store.md) | In-memory task store | Superseded by ADR-0005 |
| [0005](0005-persist-tasks-in-postgres-via-typeorm.md) | Persist tasks in PostgreSQL via TypeORM | Accepted |
| [0006](0006-document-the-api-with-openapi-swagger.md) | Document the API with OpenAPI/Swagger | Accepted |
| [0007](0007-process-tasks-on-a-queue-backed-worker.md) | Process tasks asynchronously on a queue-backed worker | Accepted |
| [0008](0008-validate-and-sanitize-input-with-a-global-validationpipe.md) | Validate and sanitize input with a global ValidationPipe | Accepted |
