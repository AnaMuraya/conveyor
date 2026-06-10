import { ApiProperty } from '@nestjs/swagger';

/**
 * Body of `POST /tasks`. Runtime validation (class-validator + a global pipe)
 * comes later; for now this is a compile-time contract plus OpenAPI schema. It
 * is a class rather than an interface so the decorators can be added in place.
 */
export class CreateTaskDto {
  @ApiProperty({
    description: 'The kind of work to perform.',
    example: 'summarize',
  })
  type: string;

  @ApiProperty({
    description:
      'Arbitrary input for the task — the material the LLM will act on.',
    type: 'object',
    additionalProperties: true,
    example: { text: 'A long article that needs summarizing…' },
  })
  payload: Record<string, unknown>;
}
