# 0004. In-memory task store

- **Status:** Superseded by [ADR-0005](0005-persist-tasks-in-postgres-via-typeorm.md)
- **Date:** 2026-06-08

## Context

The first iteration delivers `POST /tasks` and `GET /tasks/:id` to exercise
NestJS structure, DI, and testing. Real persistence (Postgres via an ORM) is a
later step; pulling it in now would add Docker, an ORM choice, and migrations
before the basic module shape is in place.

## Decision

Back `TasksService` with an **in-memory `Map`** for now. The `Task` shape
(`id`, `type`, `payload`, `status`, `result`, timestamps) is modelled now so a
Postgres table maps onto it directly later.

## Consequences

- Fast feedback and trivial tests for the module/controller/DI work, with no
  infrastructure to stand up yet.
- State is lost on restart and not shared across processes — fine for now,
  unacceptable once workers arrive. A later step replaces the `Map` with a
  repository behind the same `TasksService` API; the ORM choice will get its own
  ADR.

## Alternatives considered

- **Start with Postgres immediately:** closer to the end state, but front-loads
  persistence work and obscures the basic module structure behind infrastructure
  setup.
