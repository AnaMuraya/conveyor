import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Authorization roles a user can hold (ADR-0009). */
export type Role = 'user' | 'admin';

export const ROLES: Role[] = ['user', 'admin'];

/**
 * A platform user, persisted in the `users` table (ADR-0009). The schema is
 * owned by migrations, not by `synchronize`. Only the password *hash* is
 * stored — never the plaintext — and this entity is never serialized to a
 * client (auth returns a token, not the user row).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column('text', { array: true, default: ['user'] })
  roles: Role[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
