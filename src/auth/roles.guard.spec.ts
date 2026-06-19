import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Role } from '../users/user.entity';
import { AuthenticatedUser } from './auth.types';
import { RolesGuard } from './roles.guard';

/** Builds an ExecutionContext carrying the given principal. */
function contextFor(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guardRequiring(required: Role[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  const user: AuthenticatedUser = {
    userId: 'u1',
    username: 'ana',
    roles: ['user'],
  };
  const admin: AuthenticatedUser = {
    userId: 'u2',
    username: 'root',
    roles: ['admin'],
  };

  it('allows any caller when no roles are required', () => {
    expect(guardRequiring(undefined).canActivate(contextFor(user))).toBe(true);
  });

  it('allows a caller holding a required role', () => {
    expect(guardRequiring(['admin']).canActivate(contextFor(admin))).toBe(true);
  });

  it('forbids a caller missing every required role', () => {
    expect(() =>
      guardRequiring(['admin']).canActivate(contextFor(user)),
    ).toThrow(ForbiddenException);
  });
});
