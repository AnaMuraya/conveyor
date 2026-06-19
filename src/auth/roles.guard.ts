import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { Role } from '../users/user.entity';
import { AuthenticatedUser } from './auth.types';
import { ROLES_KEY } from './decorators/roles.decorator';

/**
 * Global authorization guard (registered via `APP_GUARD`, after authentication).
 * A no-op unless the handler declares `@Roles(...)`; when it does, the
 * authenticated caller must hold at least one of the required roles (ADR-0009).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    const allowed = user?.roles?.some((role) => required.includes(role));
    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
