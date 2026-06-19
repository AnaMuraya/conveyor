import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body of `POST /auth/register` and `POST /auth/login`. Validated by the global
 * `ValidationPipe` (ADR-0008); the same shape serves both since login simply
 * checks the credentials that register stored.
 */
export class CredentialsDto {
  @ApiProperty({ example: 'ana', description: 'Unique username.' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({
    example: 'a-strong-passphrase',
    description: 'Plaintext password; stored only as a bcrypt hash.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
