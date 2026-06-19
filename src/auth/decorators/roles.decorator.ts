import { SetMetadata } from '@nestjs/common';

import { Role } from '../../users/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to callers holding at least one of the given roles, enforced
 * by {@link RolesGuard}. A route with no `@Roles()` is open to any authenticated
 * caller (ADR-0009).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
