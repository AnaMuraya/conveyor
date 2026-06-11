import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

/** Shape returned by the liveness probe. */
export class HealthStatus {
  @ApiProperty({
    example: 'ok',
    description: 'Always "ok" when the process responds.',
  })
  status: 'ok';

  @ApiProperty({ example: 12.34, description: 'Process uptime in seconds.' })
  uptime: number;

  @ApiProperty({ example: '2026-06-11T02:30:00.000Z', format: 'date-time' })
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * Liveness probe: confirms the process is up and serving. Intentionally has
   * no dependencies — it must still answer when Postgres or Redis are down, so
   * an orchestrator doesn't kill a healthy API just because a backing service
   * is briefly unreachable. Dependency reachability is a separate *readiness*
   * concern.
   */
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'The process is up.', type: HealthStatus })
  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
