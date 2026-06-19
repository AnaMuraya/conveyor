import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CredentialsDto } from './dto/credentials.dto';

/** Shape returned by register/login: a signed bearer token. */
export class TokenResponse {
  @ApiProperty({
    description: 'Signed JWT — send as `Authorization: Bearer …`.',
  })
  accessToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a user (role: user) and returns a token.',
  })
  @ApiCreatedResponse({ description: 'User created.', type: TokenResponse })
  @ApiConflictResponse({ description: 'Username already taken.' })
  register(@Body() dto: CredentialsDto): Promise<TokenResponse> {
    return this.authService.register(dto.username, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in',
    description: 'Returns a token for valid credentials.',
  })
  @ApiOkResponse({ description: 'Authenticated.', type: TokenResponse })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  login(@Body() dto: CredentialsDto): Promise<TokenResponse> {
    return this.authService.login(dto.username, dto.password);
  }
}
