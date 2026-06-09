import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

/** All valid {@link TaskStatus} values — also drives the Postgres enum column. */
export const TASK_STATUSES: TaskStatus[] = [
  'pending',
  'running',
  'done',
  'failed',
];

/**
 * A unit of work submitted to the platform, persisted in the `tasks` table
 * (ADR-0005). The schema is owned by migrations, not by `synchronize`.
 */
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Discriminator for the kind of work, e.g. 'summarize'. */
  @Column()
  type: string;

  /** Arbitrary input for the task — the eventual LLM prompt material. */
  @Column('jsonb')
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: TASK_STATUSES, default: 'pending' })
  status: TaskStatus;

  /** The processing result once done, or null while pending/running/failed. */
  @Column({ type: 'text', nullable: true })
  result: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
