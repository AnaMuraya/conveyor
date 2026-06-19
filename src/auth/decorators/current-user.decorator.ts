import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedUser } from '../auth.types';

/**
 * Injects the authenticated principal that {@link JwtStrategy} attached to the
 * request, so handlers don't reach into `req.user` by hand.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser;
  },
);
