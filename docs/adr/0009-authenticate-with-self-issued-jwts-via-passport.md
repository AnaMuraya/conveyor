# 0009. Authenticate with self-issued JWTs via Passport

- **Status:** Accepted
- **Date:** 2026-06-18

## Context

Every endpoint is currently open: anyone who can reach the API can submit tasks,
read any task, and spend the (expensive, rate-limited) LLM budget. Before the
platform can be useful to more than one trusted caller it needs to know **who**
is calling, restrict tasks to **their** owner, and leave room to distinguish
privileged callers (operators) from ordinary ones.

We want this to stay self-contained: $0, runs locally, no external identity
provider to stand up alongside Postgres and Redis.

## Decision

Authenticate requests with **JSON Web Tokens we issue ourselves**, verified
through **NestJS's Passport integration** (`@nestjs/passport` + `passport-jwt`),
and authorize with a small **role + ownership** model.

- **Self-issued, HS256.** A `users` table stores credentials (passwords hashed
  with **bcrypt**); `POST /auth/register` creates a user, `POST /auth/login`
  verifies the password and returns a JWT signed with a shared secret (`HS256`,
  `JWT_SECRET`). No external IdP. Token claims: `sub` (user id), `username`,
  `roles`; expiry from `JWT_EXPIRES_IN`.
- **Verify via a Passport strategy.** `JwtStrategy` extracts the bearer token
  (`Authorization: Bearer …`), verifies signature + expiry, and returns the
  principal (`{ userId, username, roles }`) onto the request.
- **Secure by default, opt out explicitly.** A global `JwtAuthGuard` is
  registered with `APP_GUARD` (same module-graph pattern as the `APP_PIPE`
  ValidationPipe, ADR-0008), so *every* route requires a valid token unless it
  carries `@Public()`. `/health` and the two `/auth` endpoints are `@Public`;
  everything else is protected without per-route wiring that's easy to forget.
- **Roles via a second global guard.** A `RolesGuard` (also `APP_GUARD`, ordered
  after authN) is a no-op unless a handler declares `@Roles(...)`. Roles default
  to `['user']`; an `admin` is created out of band (DB/seed), never via
  self-registration — there is no self-promotion path.
- **Per-user ownership.** `tasks` gains an `ownerId`; `POST /tasks` stamps it
  from the caller. `GET /tasks/:id` returns a task only to its owner — **except
  an `admin`, who may read any task**. This cross-owner override is the concrete
  job that earns the role model (without it, roles would be ceremony).

## Consequences

- A caller without a valid token gets `401`; a valid token scoped to the wrong
  owner gets **`404`, not `403`** — we don't reveal that someone else's task
  exists.
- New module surface: `UsersModule` (entity + service) and `AuthModule`
  (strategy, guards, `@Public`/`@Roles`/`@CurrentUser`, controller, service). A
  migration adds the `users` table and the `tasks.ownerId` column.
- `ownerId` is added **nullable** so existing rows survive the migration; every
  task created from now on sets it. Tightening to `NOT NULL` is a later migration
  once there are no legacy rows.
- Swagger gains a bearer scheme (`addBearerAuth` + `@ApiBearerAuth`) so `/docs`
  can exercise protected routes; `/health` stays open for liveness probes.
- New runtime deps: `@nestjs/passport`, `passport`, `passport-jwt`,
  `@nestjs/jwt`, `bcrypt`.

## Deferred / not in scope

- **Refresh tokens.** Access tokens are short-lived and that's it for now; a
  refresh-token flow is added when token lifetime becomes a real friction.
- **Open registration.** `POST /auth/register` is currently open to anyone;
  gating it (invite, admin-only creation) is a later concern, called out here so
  it isn't mistaken for an oversight.
- **Secret rotation.** A single `JWT_SECRET` with no rotation; key rotation (or a
  move to asymmetric `RS256`/JWKS) waits until there's an operational need.

## Alternatives considered

- **External IdP (Auth0/Clerk/Cognito), validate-only via RS256/JWKS:** cleanest
  separation and no credential storage, but adds an external dependency that cuts
  against the "$0, runs locally" constraint. Revisit if Conveyor ever needs real
  multi-tenant identity.
- **Static API keys / a shared service token:** simplest for machine-to-machine
  use, but carries no per-user identity, so ownership and roles would have nothing
  to hang off. Rejected because ownership is in scope now.
- **Asymmetric signing (RS256):** lets verifiers check tokens without the signing
  key — valuable when issuer and verifier are separate services. Here a single
  service both issues and verifies, so the shared-secret HS256 is simpler with no
  loss. Noted as the upgrade path under rotation above.
- **`403` for cross-owner reads:** rejected in favour of `404` so the API doesn't
  leak the existence of tasks the caller doesn't own.
- **Per-route guards instead of a global one:** rejected — easy to forget on a new
  endpoint, which fails open. Global + `@Public()` fails closed.
