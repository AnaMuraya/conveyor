# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository. Keep this file
current — update it whenever structure, conventions, or workflow change.

## What this is

**Relay** — a reliable, event-driven AI task platform built on NestJS, developed
over a 12-week study/portfolio plan. Clients submit jobs via an API; the system
queues them; workers process them with an LLM; failures retry safely; clients
poll status. The reliability engineering around an unreliable, rate-limited,
expensive LLM dependency is the point — not the LLM call itself.

> The repository/package is named `conveyor`; the project/product is **Relay**.

The 12-week plan PDF lives at `docs/Relay-NestJS-AI-Refined-12-Week-Plan.pdf`.
It is **git-ignored** (local reference only, not committed).

**Real success target:** `v0.2` (event-driven, multi-service, survives a dead
worker) **plus excellent docs**. Weeks 9–12 are bonus credibility. Protect
Phase 2 (weeks 5–8) time.

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
and on every PR. Keep it green from day one.

## Architecture & conventions

- **Modular NestJS + DI.** Each feature is a module owning its controller(s) and
  provider(s); modules collaborate through exported providers and DI tokens, not
  by importing concrete classes (ADR-0002).
- **Adapter seams.** External dependencies sit behind interfaces. The
  `LlmProvider` interface (`src/llm/`) is bound to a concrete provider in
  `LlmModule` via the `LLM_PROVIDER` token; swapping Echo → Ollama → hosted is a
  one-line change, never a caller change (ADR-0003).
- **TypeScript contracts first.** DTOs, entities, and interfaces give
  compile-time guarantees now; runtime validation (class-validator) arrives in
  week 3.
- **Failure-path tests are the headline.** "duplicate delivery doesn't
  double-process" / "unknown id → 404" matter more than happy-path CRUD.
- **Earn every pattern.** No saga without genuine multi-step work; the circuit
  breaker exists because the model provider is genuinely flaky. Be able to say
  why a pattern was skipped.

### Repository layout

```
src/
  tasks/        # TasksModule — POST /tasks, GET /tasks/:id (in-memory in wk1)
  llm/          # LlmModule — LlmProvider seam + EchoLlmProvider
  app.module.ts # composes feature modules
docs/adr/       # Architecture Decision Records (see below)
.github/workflows/ci.yml
test/           # e2e specs
```

## Decisions: ADRs (not DECISIONS.md)

Design decisions are recorded as **ADRs** — one Markdown file per decision under
`docs/adr/` — written the day the decision is made. This replaces the plan's
suggested single `DECISIONS.md`. To add one, copy `docs/adr/template.md` to the
next `NNNN-title.md`, fill it in, and add a row to `docs/adr/README.md`. The ADR
log feeds the eventual design doc and the portfolio "Key calls" copy.

## Git & commit policy

- **Always ask before committing.** Never commit unprompted.
- **Never push.** Pushing is the user's call.
- **Do not add a `Co-Authored-By` / "co-authored" trailer** to commit messages.
- **Branch per week.** Each week's implementation lands on its own appropriately
  named feature branch (e.g. `week-1-foundations`); `main` holds the baseline and
  merged work.

## Roadmap & status

Phase 1 (wk 1–4): foundations → **v0.1**. Phase 2 (wk 5–8): async, reliable,
event-driven → **v0.2** (real target). Phase 3 (wk 9–12): secure, cache, observe,
containerize, deploy → **v1.0** (stretch).

**Current status — Week 1 (NestJS architecture & TypeScript):** tasks module
(`POST /tasks`, `GET /tasks/:id`, in-memory), `LlmProvider` adapter seam with
`EchoLlmProvider`, CI, and ADRs 0001–0004 in place. Persistence (Postgres) is
week 2.
