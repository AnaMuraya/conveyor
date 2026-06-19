import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auth schema (ADR-0009): the `users` table, and an owner link from `tasks` to
 * its creator. Hand-written to stay reviewable. `owner_id` is nullable so
 * existing task rows survive — every task created after this sets it; a later
 * migration can tighten it to NOT NULL once no legacy rows remain.
 */
export class AddUsersAndTaskOwner1750000000000 implements MigrationInterface {
  name = 'AddUsersAndTaskOwner1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "username" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "roles" text[] NOT NULL DEFAULT '{user}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username")
      )
    `);
    await queryRunner.query(`ALTER TABLE "tasks" ADD "ownerId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD CONSTRAINT "FK_tasks_owner"
        FOREIGN KEY ("ownerId") REFERENCES "users"("id")
        ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_owner"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "ownerId"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
