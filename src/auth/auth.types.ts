import { Role } from '../users/user.entity';

/** Claims carried in the signed JWT. `sub` is the user id (JWT convention). */
export interface JwtPayload {
  sub: string;
  username: string;
  roles: Role[];
}

/**
 * The authenticated principal attached to the request by {@link JwtStrategy}
 * (as `req.user`) and surfaced to handlers via `@CurrentUser()`.
 */
export interface AuthenticatedUser {
  userId: string;
  username: string;
  roles: Role[];
}
