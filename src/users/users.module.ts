import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './user.entity';
import { UsersService } from './users.service';

/**
 * Owns the `users` table and {@link UsersService}. Exports the service so
 * AuthModule can register and look up users without importing the repository
 * directly (ADR-0002).
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
