# 0003. LLM access behind a provider adapter seam

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The LLM call is Relay's task payload: slow, flaky, costly work. The plan asks us
to "define the `LlmProvider` interface now — even if it just echoes — so the
adapter seam exists from the start." Inference providers will change over the
project: an echo stub now, local Ollama in week 4, and a free-tier hosted model
for the deployed demo in week 12.

## Decision

Put all LLM access behind an `LlmProvider` interface (`generate(prompt) =>
{ output, model }`), bound to a concrete implementation in `LlmModule` via the
`LLM_PROVIDER` DI token. Week 1 ships `EchoLlmProvider`. Swapping providers is a
one-line change in `LlmModule`, never a change to callers.

## Consequences

- Provider swaps (Echo → Ollama → hosted) become configuration, not rewrites —
  the week-12 deploy swap is itself a talking point.
- The flaky-dependency reliability work (retries, backoff, circuit breaker,
  caching) all attaches to this single seam in later weeks.
- The interface is unused by task processing in week 1 by design; the
  synchronous LLM call is wired into `TasksService` in week 4. Carrying an
  exercised-but-unwired seam is a deliberate, cheap investment.

## Alternatives considered

- **Call the LLM SDK directly from `TasksService`:** simplest now, but couples
  business logic to one vendor and makes the later reliability layer and
  provider swap invasive.
