import 'dotenv/config';
import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';

import { Task } from '../tasks/task.entity';

/**
 * Single source of TypeORM connection settings, shared by the Nest app
 * (`TypeOrmModule.forRoot`) and the TypeORM CLI (migrations). Credentials come
 * from the environment — see `.env.example`.
 *
 * `synchronize` is off on purpose: the schema is owned by migrations
 * (ADR-0005). The migrations glob is anchored to this file's directory so it
 * resolves under `src/` with ts-node and under `dist/` once compiled.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'conveyor',
  entities: [Task],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

export default new DataSource(dataSourceOptions);
