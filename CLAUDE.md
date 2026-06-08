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
Everything runs locally at $0 (local Ollama for inference).

## Commands

```bash
npm run start:dev     # run with watch
npm run lint          # eslint (autofix)
npm test              # unit tests (Jest, *.spec.ts under src/)
npm run test:e2e      # e2e tests (test/*.e2e-spec.ts)
npm run build         # nest build -> dist/
```

CI (`.github/workflows/ci.yml`) runs lint → unit → e2e → build on push to `main`
and on every PR. Keep it green.

## Architecture & conventions

- **Modular NestJS + DI.** Each feature is a module owning its controller(s) and
  provider(s); modules collaborate through exported providers and DI tokens, not
  by importing concrete classes (ADR-0002).
- **Adapter seams.** External dependencies sit behind interfaces. The
  `LlmProvider` interface (`src/llm/`) is bound to a concrete provider in
  `LlmModule` via the `LLM_PROVIDER` token; swapping Echo → Ollama → hosted is a
  one-line change, never a caller change (ADR-0003).
- **TypeScript contracts first.** DTOs, entities, and interfaces give
  compile-time guarantees; runtime validation (class-validator) comes later.
- **Failure-path tests are the headline.** "duplicate delivery doesn't
  double-process" / "unknown id → 404" matter more than happy-path CRUD.
- **Earn every pattern.** No saga without genuine multi-step work; a circuit
  breaker exists only because the model provider is genuinely flaky. Be able to
  say why a pattern was skipped.

### Repository layout

```
src/
  tasks/        # TasksModule — POST /tasks, GET /tasks/:id (in-memory for now)
  llm/          # LlmModule — LlmProvider seam + EchoLlmProvider
  app.module.ts # composes feature modules
docs/adr/       # Architecture Decision Records (see below)
.github/workflows/ci.yml
test/           # e2e specs
```

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

Tasks API (`POST /tasks`, `GET /tasks/:id`) backed by an in-memory store, plus an
`LlmProvider` adapter seam with an echo stub (`EchoLlmProvider`). CI and ADRs
0001–0004 are in place. Next up: PostgreSQL persistence behind `TasksService`.
