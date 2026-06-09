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

A single NestJS application accepts tasks over HTTP and persists them in
PostgreSQL via a TypeORM repository. The LLM provider seam exists but is not yet
consumed by task processing.

```mermaid
flowchart LR
  Client([Client])

  subgraph App["NestJS application (AppModule)"]
    direction TB

    subgraph Tasks["TasksModule"]
      TC["TasksController<br/>POST /tasks · GET /tasks/:id"]
      TS["TasksService"]
      Repo["Repository&lt;Task&gt;"]
      TC --> TS --> Repo
    end

    subgraph Llm["LlmModule"]
      Token{{"LLM_PROVIDER token"}}
      Echo["EchoLlmProvider<br/>(stub)"]
      Token --> Echo
    end
  end

  DB[("PostgreSQL<br/>tasks table")]

  Client -->|HTTP / JSON| TC
  Repo -->|SQL| DB
  TS -. "not wired yet — future: generate(prompt)" .-> Token
```

## Request flows — current

### Create a task — `POST /tasks`

```mermaid
sequenceDiagram
  actor Client
  participant C as TasksController
  participant S as TasksService
  participant R as Repository
  participant DB as PostgreSQL

  Client->>C: POST /tasks { type, payload }
  C->>S: create(dto)
  S->>R: create + save (status = pending)
  R->>DB: INSERT INTO tasks ... RETURNING *
  DB-->>R: row (id, timestamps)
  R-->>S: Task
  S-->>C: Task
  C-->>Client: 201 Created + Task (status: pending)
```

### Fetch a task — `GET /tasks/:id`

`:id` is validated as a UUID first (`ParseUUIDPipe`), so a malformed id is
rejected with `400` before any lookup.

```mermaid
sequenceDiagram
  actor Client
  participant C as TasksController
  participant S as TasksService
  participant R as Repository
  participant DB as PostgreSQL

  Client->>C: GET /tasks/:id
  Note over C: ParseUUIDPipe — malformed id → 400
  C->>S: findOne(id)
  S->>R: findOneBy({ id })
  R->>DB: SELECT * FROM tasks WHERE id = $1
  alt found
    DB-->>R: row
    R-->>S: Task
    S-->>C: Task
    C-->>Client: 200 OK + Task
  else not found
    DB-->>R: (no rows)
    R-->>S: null
    S-->>C: throw NotFoundException
    C-->>Client: 404 Not Found
  end
```

## Target architecture — planned

Where the system is heading: the slow LLM call moves off the request path, behind
a queue, into a separate worker that survives restarts. **None of the dashed
components exist yet** — they arrive as implementation progresses, each justified
by an ADR.

```mermaid
flowchart LR
  Client([Client])
  Client -->|submit| GW["API gateway"]
  Client -->|poll status| GW

  GW -. "atomic write + enqueue" .-> DB[("PostgreSQL")]
  GW -. enqueue .-> Q[("Redis · BullMQ queue")]
  W["Worker"] -. consume .-> Q
  W -. "generate()" .-> LLM["LlmProvider<br/>Ollama / hosted"]
  W -. "persist result" .-> DB
  Q -. "poison jobs" .-> DLQ[("Dead-letter queue")]

  GW --> DB
```

### How today maps onto the target

| Concern | Today | Target |
| --- | --- | --- |
| Task intake | `TasksController` | API gateway service |
| Storage | ✅ PostgreSQL (TypeORM) | PostgreSQL, shared by API + worker |
| LLM work | seam only (echo stub) | worker calls provider off the request path |
| Delivery | synchronous | queue + retries + dead-letter queue |
| Provider | `EchoLlmProvider` | Ollama (local) / hosted, same `LlmProvider` seam |

As each row's "Today" catches up to "Target", the diagrams above move from dashed
to solid and this table shrinks.
