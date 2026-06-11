import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/** Exposes the liveness probe at `GET /health`. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
