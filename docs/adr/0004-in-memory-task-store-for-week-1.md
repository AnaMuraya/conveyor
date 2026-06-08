# 0004. In-memory task store for week 1

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

Week 1 delivers `POST /tasks` and `GET /tasks/:id` to exercise NestJS structure,
DI, and testing. Real persistence (Postgres via an ORM) is explicitly a week-2
deliverable. Pulling Postgres in now would add Docker, an ORM choice, and
migrations before the basic module shape is in place.

## Decision

Back `TasksService` with an **in-memory `Map`** for week 1. The `Task` shape
(`id`, `type`, `payload`, `status`, `result`, timestamps) is modelled now so the
week-2 Postgres table maps onto it directly.

## Consequences

- Fast feedback and trivial tests for the module/controller/DI lesson, with no
  infrastructure to stand up yet.
- State is lost on restart and not shared across processes — fine for week 1,
  unacceptable once workers arrive. Week 2 replaces the `Map` with a repository
  behind the same `TasksService` API; the ORM choice will get its own ADR.

## Alternatives considered

- **Start with Postgres immediately:** closer to the end state, but front-loads
  week-2 work and obscures the week-1 lesson behind infrastructure setup.
