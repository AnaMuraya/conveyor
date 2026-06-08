# 0003. LLM access behind a provider adapter seam

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The LLM call is the platform's task payload: slow, flaky, costly work. Inference
providers will change over the life of the project — an echo stub now, a local
Ollama provider next, and a hosted model for any deployed demo — so we want to
commit to none of them at the call sites.

## Decision

Put all LLM access behind an `LlmProvider` interface (`generate(prompt) =>
{ output, model }`), bound to a concrete implementation in `LlmModule` via the
`LLM_PROVIDER` DI token. It ships with `EchoLlmProvider`. Swapping providers is a
one-line change in `LlmModule`, never a change to callers.

## Consequences

- Provider swaps (Echo → Ollama → hosted) become configuration, not rewrites —
  swapping in a hosted provider for a deployed demo is a config change.
- The flaky-dependency reliability work (retries, backoff, circuit breaker,
  caching) all attaches to this single seam later.
- The interface is unused by task processing for now by design; the LLM call is
  wired into `TasksService` later. Carrying an exercised-but-unwired seam is a
  deliberate, cheap investment.

## Alternatives considered

- **Call the LLM SDK directly from `TasksService`:** simplest now, but couples
  business logic to one vendor and makes the later reliability layer and
  provider swap invasive.
