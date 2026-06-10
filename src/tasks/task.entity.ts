import { ApiProperty } from '@nestjs/swagger';
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
 * (ADR-0005). The schema is owned by migrations, not by `synchronize`. The
 * `@ApiProperty` decorators double as the OpenAPI response schema.
 */
@Entity('tasks')
export class Task {
  @ApiProperty({ format: 'uuid', description: 'Unique task id.' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Discriminator for the kind of work.',
    example: 'summarize',
  })
  @Column()
  type: string;

  @ApiProperty({
    description:
      'Arbitrary input for the task — the eventual LLM prompt material.',
    type: 'object',
    additionalProperties: true,
    example: { text: 'A long article that needs summarizing…' },
  })
  @Column('jsonb')
  payload: Record<string, unknown>;

  @ApiProperty({
    description: 'Lifecycle status of the task.',
    enum: TASK_STATUSES,
    example: 'pending',
  })
  @Column({ type: 'enum', enum: TASK_STATUSES, default: 'pending' })
  status: TaskStatus;

  @ApiProperty({
    description: 'The processing result once done; null until then.',
    type: String,
    nullable: true,
    example: null,
  })
  @Column({ type: 'text', nullable: true })
  result: string | null;

  @ApiProperty({ description: 'When the task was created.' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'When the task was last updated.' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
