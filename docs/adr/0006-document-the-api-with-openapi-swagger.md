# 0006. Document the API with OpenAPI/Swagger

- **Status:** Accepted
- **Date:** 2026-06-10

## Context

The API needs to be inspectable: a reviewer should be able to see every endpoint,
its request/response shapes, and status codes without reading the source. The
docs must not drift from the implementation.

## Decision

Generate **OpenAPI** docs from the code (code-first) with `@nestjs/swagger`, and
serve the interactive **Swagger UI** at `/docs` (raw spec at `/docs-json`).

- Endpoints are annotated with `@ApiTags`, `@ApiOperation`, and explicit response
  decorators (`@ApiCreatedResponse`, `@ApiOkResponse`, `@ApiNotFoundResponse`,
  `@ApiBadRequestResponse`).
- `@ApiProperty` on `CreateTaskDto` and the `Task` entity provides rich schemas
  (types, examples, the `status` enum).

## Consequences

- Docs are derived from the code, so they stay in sync as the API evolves.
- The `Task` entity now also carries `@ApiProperty` decorators, so it doubles as
  the response schema. This couples the persistence entity to the API contract;
  acceptable for now. If the API and stored shapes diverge, introduce a dedicated
  `TaskResponseDto` rather than exposing the entity directly.
- Swagger only affects the running server (`main.ts`); it adds no behaviour to
  the request path and is invisible to the e2e tests (which boot the app
  module directly).

## Alternatives considered

- **Spec-first (write the OpenAPI YAML by hand):** authoritative contract, but
  easy to drift from the code and more ceremony than this stage needs.
- **No API docs:** rejected — inspectability is a core goal of the project.
