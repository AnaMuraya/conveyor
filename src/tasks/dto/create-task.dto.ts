/**
 * Body of `POST /tasks`. Runtime validation (class-validator + a global pipe)
 * comes later; for now this is a compile-time contract only. It is a class
 * rather than an interface so the validation decorators can be added in place.
 */
export class CreateTaskDto {
  type: string;
  payload: Record<string, unknown>;
}
