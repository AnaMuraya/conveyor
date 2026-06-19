import 'dotenv/config';

/**
 * JWT signing settings, read from the environment (see `.env.example`). The
 * default secret is intentionally obvious and insecure — it keeps local dev and
 * tests running with no setup, but **`JWT_SECRET` must be set in any real
 * deployment** (ADR-0009). HS256 with a shared secret, since one service both
 * issues and verifies.
 */
export const jwtConfig = {
  secret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
  expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
};
