import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { Role, User } from './user.entity';

/**
 * Persistence for users, behind the service so callers stay ORM-agnostic
 * (mirrors TasksService). Password hashing lives in AuthService — this layer
 * only stores and looks up the row.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  create(username: string, passwordHash: string, roles: Role[] = ['user']) {
    const user = this.users.create({ username, passwordHash, roles });
    return this.users.save(user);
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users.findOneBy({ username });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }
}
