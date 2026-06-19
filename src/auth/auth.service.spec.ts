import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByUsername: jest.Mock;
    create: jest.Mock;
  };
  let jwt: { sign: jest.Mock };

  beforeEach(() => {
    users = {
      findByUsername: jest.fn(),
      create: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    service = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('hashes the password (never stores plaintext) and returns a token', async () => {
      users.findByUsername.mockResolvedValue(null);
      users.create.mockImplementation(
        (username: string, passwordHash: string) =>
          Promise.resolve({
            id: 'u1',
            username,
            passwordHash,
            roles: ['user'],
          } as User),
      );

      const result = await service.register('ana', 'a-strong-pass');

      expect(result.accessToken).toBe('signed.jwt.token');
      const [, storedHash] = users.create.mock.calls[0] as [string, string];
      expect(storedHash).not.toBe('a-strong-pass');
      await expect(bcrypt.compare('a-strong-pass', storedHash)).resolves.toBe(
        true,
      );
    });

    it('rejects a duplicate username', async () => {
      users.findByUsername.mockResolvedValue({ id: 'u1' });

      await expect(service.register('ana', 'a-strong-pass')).rejects.toThrow(
        ConflictException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('a-strong-pass', 10);
      users.findByUsername.mockResolvedValue({
        id: 'u1',
        username: 'ana',
        passwordHash,
        roles: ['user'],
      });

      const result = await service.login('ana', 'a-strong-pass');

      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('a-strong-pass', 10);
      users.findByUsername.mockResolvedValue({
        id: 'u1',
        username: 'ana',
        passwordHash,
        roles: ['user'],
      });

      await expect(service.login('ana', 'wrong-pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an unknown user (same error as a wrong password)', async () => {
      users.findByUsername.mockResolvedValue(null);

      await expect(service.login('nobody', 'a-strong-pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
