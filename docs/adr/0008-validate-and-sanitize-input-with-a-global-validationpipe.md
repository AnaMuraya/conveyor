# 0008. Validate and sanitize input with a global ValidationPipe

- **Status:** Accepted
- **Date:** 2026-06-11

## Context

Until now, DTOs were a compile-time contract and OpenAPI schema only — nothing
checked a request body at runtime. `POST /tasks` would accept `{}`, a numeric
`type`, or arbitrary extra fields and persist them. For a platform whose point is
reliability, "garbage in" should be rejected at the edge, not discovered
downstream.

## Decision

Validate and sanitize every request body with a **global `ValidationPipe`**
(class-validator + class-transformer), and declare the rules on the DTOs.

- DTO fields carry `class-validator` decorators (`@IsString`, `@IsNotEmpty`,
  `@IsObject`, …) alongside their existing `@ApiProperty`.
- The pipe is configured `whitelist: true` (strip properties not on the DTO),
  `forbidNonWhitelisted: true` (reject bodies carrying unknown properties), and
  `transform: true` (hand the handler a real DTO instance).
- It is registered via the **`APP_PIPE`** provider in `AppModule`, not
  `app.useGlobalPipes(...)` in `main.ts`. Registering it as a provider makes it
  part of the module graph, so it applies wherever `AppModule` is bootstrapped —
  including the e2e tests, which build the app from the module and never run
  `main.ts`. (It can also inject dependencies if a future pipe needs them.)

## Consequences

- A malformed body is turned away with `400` before reaching the service, with
  field-level messages from class-validator.
- `whitelist` strips unknown **top-level** DTO properties; `forbidNonWhitelisted`
  rejects them outright. This does **not** reach inside `payload`, which is
  intentionally free-form (`Record<string, unknown>`) — arbitrary keys there are
  preserved, only an unknown key at the request-body root is rejected.
- `reflect-metadata` and decorator metadata must remain enabled (already true
  for TypeORM/Swagger), since validation reads the decorators at runtime.
- New runtime dependencies: `class-validator`, `class-transformer`.

## Alternatives considered

- **`app.useGlobalPipes()` in `main.ts`:** the common tutorial form, but it sits
  outside the module graph, so e2e tests (which bootstrap `AppModule` directly)
  would silently skip validation unless each test re-registered the pipe.
  `APP_PIPE` avoids that drift.
- **Manual validation in the controller/service:** scatters checks, easy to
  forget on a new endpoint, and duplicates what the decorators already express.
- **No runtime validation (status quo):** rejected — it leaves a real
  "garbage in" gap on a write endpoint.
