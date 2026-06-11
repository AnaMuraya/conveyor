# 0007. Process tasks asynchronously on a queue-backed worker

- **Status:** Accepted
- **Date:** 2026-06-11

## Context

The whole point of Conveyor is reliability around a slow, rate-limited, flaky
LLM dependency. Running the LLM call inside the `POST /tasks` request makes the
client wait on it, ties up an HTTP connection for the duration, and loses the
work if the process dies mid-call. We need the LLM call off the request path,
with retries, and the ability for processing to survive a restart and catch up.

## Decision

Submit and process tasks across a **queue**. `POST /tasks` persists the task as
`pending` and enqueues a job, then returns immediately; a separate **worker
process** consumes jobs and runs them through the `LlmProvider`.

- **BullMQ on Redis** is the queue (`@nestjs/bullmq`). Redis is the hand-off
  point both processes share; its persistence is what lets queued work survive a
  crash.
- **Separate worker process.** The API (`main.ts` → `AppModule`) and the worker
  (`worker.ts` → `WorkerModule`) are distinct entrypoints over one codebase. The
  producer side (`TasksModule`) and the consumer side (`TasksProcessingModule`,
  holding `TaskProcessor`) are separate modules, so the BullMQ worker is created
  only in the worker process — the API never consumes. This lets the worker be
  killed, restarted, or scaled independently; the API keeps accepting and
  queuing tasks while it is down, and the worker drains the backlog on return.
- **Postgres stays the source of truth.** The job carries only the task id; the
  worker loads the row, transitions `pending → running → done`, and writes the
  result. Status lives in the database, not the queue.
- **Idempotent processing.** The job id is the task id (so the API can't enqueue
  two jobs for one task), and the processor skips any task that is not still
  `pending` — a redelivered job can't re-run the LLM or overwrite a result.
- **Retry then fail.** Jobs retry with exponential backoff (3 attempts); a task
  moves to `failed` only once attempts are exhausted, so a task that succeeds on
  retry never shows `failed`.

## Consequences

- A new infra dependency: Redis (added to `docker-compose.yml` and CI). Local
  cost stays $0.
- Two processes to run in development (`start:dev` and `start:worker:dev`) and
  to deploy. The shared codebase keeps this cheap.
- The `LlmProvider` seam is now actually exercised (by the worker), not just
  wired — `EchoLlmProvider` remains the stub; the Echo → Ollama swap is still a
  one-line change in `LlmModule` (ADR-0003).
- Failure-path coverage moves to the processor: duplicate-delivery-skips and
  retry-then-fail are unit-tested without Redis; a queue round-trip is covered
  by an e2e against real Redis + Postgres.

## Alternatives considered

- **In-process worker** (processor registered inside the API): one process,
  simplest wiring, and it still survives restarts because jobs live in Redis.
  Rejected as the default because it can't be scaled or restarted independently
  of the API, which weakens the core "kill the worker, the API keeps working"
  property. The module split leaves this a small change if we ever want it.
- **A dedicated dead-letter queue** for poison jobs: deferred. BullMQ's `failed`
  set plus the task's `failed` status cover exhausted retries for now; a DLQ is
  earned once there is explicit poison-job handling to justify it (ADR-style
  "earn every pattern").
- **Postgres-only (`SELECT … FOR UPDATE SKIP LOCKED`) as the queue:** avoids
  Redis, but we would be reimplementing retries, backoff, delays, and
  concurrency that BullMQ already provides. Redis is already on the v1.0 roadmap
  for caching, so the dependency is not net-new.
