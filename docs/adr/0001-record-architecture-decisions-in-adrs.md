# 0001. Record architecture decisions as ADRs

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The Relay plan calls for capturing decisions from week 1 — "write decisions the
day you make them" — so they can later seed the design doc and the portfolio's
"Key calls" copy. The plan's default suggestion is a single `DECISIONS.md` (an
ADR log in one file).

## Decision

Use **one Markdown file per decision** under `docs/adr/` (the ADR convention)
rather than a single `DECISIONS.md`. Each record carries its own context,
status, and consequences. An index and template live in `docs/adr/README.md`.

## Consequences

- Each decision is atomic: it can be superseded, linked to, and reviewed on its
  own. Status transitions (Accepted → Superseded) are explicit per decision.
- Decisions read cleanly in PR diffs — a new call is a new file, not a line
  buried in a growing document.
- Slightly more ceremony per decision (a new file vs. a new heading). Acceptable
  for the clarity gained.
- The final design doc is assembled by reading the ADR log in order.

## Alternatives considered

- **Single `DECISIONS.md`** (the plan's default): lower friction, but decisions
  blur together, are awkward to supersede, and produce noisier diffs as the file
  grows.
