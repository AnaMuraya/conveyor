# Architecture

A living description of how the system is built. Updated as implementation
progresses — it always reflects the **current** state, with a clearly-labelled
sketch of where things are heading.

Point-in-time *decisions* (and why we made them) live in [`adr/`](adr/README.md);
this document shows the resulting structure and behaviour.

> Diagrams are [Mermaid](https://mermaid.js.org/) — they render on GitHub and
> diff as plain text. **Convention:** solid lines are implemented today; dashed
> lines are planned and not yet built.

## System overview — current

Two processes over one codebase share Postgres and Redis. The **API** (`main.ts`
→ `AppModule`) accepts tasks over HTTP, persists them as `pending`, and enqueues
a job — then returns immediately. The **worker** (`worker.ts` → `WorkerModule`)
consumes jobs off the BullMQ queue and runs them through the `LlmProvider`, off
the request path, writing the result back to Postgres. Killing the worker
doesn't stop intake: the API keeps queuing, and the worker drains the backlog
when it restarts (ADR-0007). The HTTP API is documented with OpenAPI/Swagger at
`/docs` (ADR-0006).

Requests are authenticated with **self-issued JWTs** (ADR-0009): clients
register/log in for a bearer token, and a global guard rejects any unauthenticated
request to a non-`@Public()` route. Tasks are owned by the user who created them —
a caller sees only their own, except an `admin`. `/health` and `/auth` are public.

```mermaid
flowchart LR
  Client([Client])

  subgraph API["API process (AppModule)"]
    direction TB
    AC["AuthController<br/>POST /auth/register · /login"]
    Guard{{"Global JwtAuthGuard<br/>+ RolesGuard"}}
    TC["TasksController<br/>POST /tasks · GET /tasks/:id"]
    TS["TasksService<br/>(producer)"]
    Repo1["Repository&lt;Task&gt;"]
    RepoU["Repository&lt;User&gt;"]
    AC --> RepoU
    Guard -.->|guards| TC
    TC --> TS --> Repo1
  end

  subgraph Worker["Worker process (WorkerModule)"]
    direction TB
    TP["TaskProcessor<br/>(consumer)"]
    Repo2["Repository&lt;Task&gt;"]
    Token{{"LLM_PROVIDER token"}}
    Echo["EchoLlmProvider<br/>(stub)"]
    TP --> Repo2
    TP --> Token --> Echo
  end

  Q[("Redis<br/>BullMQ 'tasks' queue")]
  DB[("PostgreSQL<br/>tasks + users tables")]

  Client -->|"HTTP / JSON (Bearer)"| TC
  Client -->|register / login| AC
  TS -->|"add(job: taskId)"| Q
  Q -->|consume| TP
  Repo1 -->|SQL| DB
  RepoU -->|SQL| DB
  Repo2 -->|SQL| DB
```

## Request flows — current

### Create a task — `POST /tasks`

The request is authenticated first (global `JwtAuthGuard` — no/invalid token →
`401`), then the body is validated at the edge (global `ValidationPipe` — invalid
or unknown-field bodies are rejected with `400` before the handler runs). The task
is stamped with the caller as owner, then the request returns as soon as it is
persisted and the job is queued; the LLM call happens later, in the worker.

```mermaid
sequenceDiagram
  actor Client
  participant C as TasksController
  participant S as TasksService
  participant R as Repository
  participant DB as PostgreSQL
  participant Q as Redis / BullMQ

  Client->>C: POST /tasks { type, payload } + Bearer
  Note over C: JwtAuthGuard — no/invalid token → 401
  Note over C: ValidationPipe — invalid body → 400
  C->>S: create(dto, ownerId)
  S->>R: create + save (status = pending, ownerId)
  R->>DB: INSERT INTO tasks ... RETURNING *
  DB-->>R: row (id, timestamps)
  R-->>S: Task
  S->>Q: add(job, { jobId: task.id })
  S-->>C: Task
  C-->>Client: 201 Created + Task (status: pending)
```

### Process a task — worker

Off the request path. A redelivered job whose task is no longer `pending` is
skipped (idempotency); a thrown error retries with backoff and only lands on
`failed` once attempts are exhausted.

```mermaid
sequenceDiagram
  participant Q as Redis / BullMQ
  participant P as TaskProcessor
  participant R as Repository
  participant DB as PostgreSQL
  participant L as LlmProvider

  Q->>P: job { taskId }
  P->>R: findOneBy(id)
  R->>DB: SELECT * FROM tasks WHERE id = $1
  alt missing or not 'pending'
    P-->>Q: skip (idempotent / nothing to do)
  else pending
    P->>R: update(status = running)
    P->>L: generate(prompt)
    L-->>P: { output, model }
    P->>R: update(status = done, result)
    R->>DB: UPDATE tasks SET ...
  end
```

### Fetch a task — `GET /tasks/:id`

The caller is authenticated (`401` without a valid token), then `:id` is validated
as a UUID (`ParseUUIDPipe`), so a malformed id is rejected with `400` before any
lookup. A task is returned only to its owner (or an `admin`); anyone else gets
`404` — the same as a non-existent id, so ownership isn't leaked (ADR-0009).

```mermaid
sequenceDiagram
  actor Client
  participant C as TasksController
  participant S as TasksService
  participant R as Repository
  participant DB as PostgreSQL

  Client->>C: GET /tasks/:id + Bearer
  Note over C: JwtAuthGuard — no/invalid token → 401
  Note over C: ParseUUIDPipe — malformed id → 400
  C->>S: findOne(id, requester)
  S->>R: findOneBy({ id })
  R->>DB: SELECT * FROM tasks WHERE id = $1
  alt found and (owner or admin)
    DB-->>R: row
    R-->>S: Task
    S-->>C: Task
    C-->>Client: 200 OK + Task
  else missing or not visible to caller
    S-->>C: throw NotFoundException
    C-->>Client: 404 Not Found
  end
```

## Target architecture — planned

The queue + separate worker now exist (solid above). What remains dashed: an
explicit **dead-letter queue** for poison jobs, and swapping the echo stub for
real inference. They arrive as implementation progresses, each justified by an
ADR.

```mermaid
flowchart LR
  Client([Client])
  Client -->|submit| API["API process"]
  Client -->|poll status| API

  API -->|"write (pending)"| DB[("PostgreSQL")]
  API -->|enqueue| Q[("Redis · BullMQ queue")]
  W["Worker process"] -->|consume| Q
  W -. "generate()" .-> LLM["LlmProvider<br/>Ollama / hosted"]
  W -->|"persist result"| DB
  Q -. "poison jobs" .-> DLQ[("Dead-letter queue")]
```

### How today maps onto the target

| Concern | Today | Target |
| --- | --- | --- |
| Task intake | ✅ `TasksController`, returns immediately | same, behind a gateway |
| Auth | ✅ self-issued JWT, per-user ownership, roles (ADR-0009) | + refresh tokens, gated registration |
| Storage | ✅ PostgreSQL (TypeORM), shared by API + worker | same |
| LLM work | ✅ worker calls the provider off the request path | same, real model |
| Delivery | ✅ queue + retries (BullMQ); idempotent processing | + dead-letter queue for poison jobs |
| Provider | `EchoLlmProvider` (stub) | Ollama (local) / hosted, same `LlmProvider` seam |

As each row's "Today" catches up to "Target", the diagrams above move from dashed
to solid and this table shrinks.
