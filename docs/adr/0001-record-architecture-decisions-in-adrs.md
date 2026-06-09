# 0001. Record architecture decisions as ADRs

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

We want a durable record of the significant design decisions made while building
this project, written when each decision is made, while the reasoning is fresh.
That record should be easy to review, link to, and revise as decisions are
superseded.

## Decision

Keep **one Markdown file per decision** under `docs/adr/`. Each record carries
its own context, status, and consequences. An index and template live in
`docs/adr/README.md`.

## Consequences

- Each decision is atomic: it can be superseded, linked to, and reviewed on its
  own. Status transitions (Accepted → Superseded) are explicit per decision.
- Decisions read cleanly in PR diffs — a new call is a new file, not a line
  buried in a growing document.
- Slightly more ceremony per decision (a new file vs. a new heading). Acceptable
  for the clarity gained.

## Alternatives considered

- **A single combined decisions document:** lower friction, but decisions blur
  together, are awkward to supersede, and produce noisier diffs as the file
  grows.
