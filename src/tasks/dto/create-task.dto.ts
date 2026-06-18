import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

/**
 * Body of `POST /tasks`. Validated at the edge by the global `ValidationPipe`
 * (ADR-0008): unknown properties are stripped/rejected, and a body that doesn't
 * match these decorators is turned away with `400` before it reaches the
 * service. Doubles as the OpenAPI request schema via `@ApiProperty`.
 */
export class CreateTaskDto {
  @ApiProperty({
    description: 'The kind of work to perform.',
    example: 'summarize',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description:
      'Arbitrary input for the task — the material the LLM will act on.',
    type: 'object',
    additionalProperties: true,
    example: { text: 'A long article that needs summarizing…' },
  })
  @IsObject()
  payload: Record<string, unknown>;
}
