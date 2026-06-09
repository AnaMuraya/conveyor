import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: the `tasks` table and its status enum. Hand-written (rather
 * than generated) so the first migration is reviewable and has no live-DB
 * dependency. `gen_random_uuid()` is built into PostgreSQL 13+, so no extension
 * is required.
 */
export class CreateTasksTable1717200000000 implements MigrationInterface {
  name = 'CreateTasksTable1717200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('pending', 'running', 'done', 'failed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'pending',
        "result" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
  }
}
