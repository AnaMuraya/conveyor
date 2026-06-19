import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as exempt from the global {@link JwtAuthGuard} — the app is
 * secure by default (ADR-0009), so opting out is explicit. Used by `/health`
 * and the `/auth` endpoints.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
