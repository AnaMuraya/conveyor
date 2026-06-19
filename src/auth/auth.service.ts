import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';

const BCRYPT_ROUNDS = 10;

/**
 * Registration and login (ADR-0009). Owns password hashing (bcrypt) and token
 * signing; UsersService owns persistence. Self-registration always yields the
 * `user` role — there is no path to grant `admin` here.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(
    username: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const existing = await this.users.findByUsername(username);
    if (existing) {
      throw new ConflictException('Username already taken');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.users.create(username, passwordHash);
    return this.sign(user);
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.users.findByUsername(username);
    // Compare even when the user is missing? Not needed here — a generic message
    // already avoids revealing which half was wrong.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.sign(user);
  }

  private sign(user: User): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    };
    return { accessToken: this.jwt.sign(payload) };
  }
}
