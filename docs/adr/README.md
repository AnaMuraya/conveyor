# Architecture Decision Records (ADRs)

Relay captures design decisions as **ADRs** — one Markdown file per decision —
instead of a single running `DECISIONS.md`. Each record is small, immutable once
accepted, and written the day the decision is made, while the reasoning is fresh.
Together they feed the final design doc and the "Key calls" section of the
portfolio writeup.

## Why ADRs (and not DECISIONS.md)

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

A decision to **not** adopt a pattern is worth recording too — knowing why you
skipped the saga or the circuit breaker is the senior signal.

## Index

| ADR | Title | Status |
| --- | ----- | ------ |
| [0001](0001-record-architecture-decisions-in-adrs.md) | Record architecture decisions as ADRs | Accepted |
| [0002](0002-nestjs-typescript-modular-architecture.md) | NestJS + TypeScript with a modular architecture | Accepted |
| [0003](0003-llmprovider-adapter-seam.md) | LLM access behind a provider adapter seam | Accepted |
| [0004](0004-in-memory-task-store-for-week-1.md) | In-memory task store for week 1 | Accepted |
