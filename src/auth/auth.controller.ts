import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Headers,
  Res,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('signup')
  signup(@Body() signUpDto: AuthDto) {
    return this.authService.signup(signUpDto.username, signUpDto.password);
  }
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Res({ passthrough: true }) res, @Body() loginDto: AuthDto) {
    const { accessToken, refreshToken } = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );
    return { accessToken, refreshToken };
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('refresh')
  async refresh(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const refreshToken = authHeader.split(' ')[1];

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;
    const isValid = await this.authService.verifyRefreshToken(
      userId,
      refreshToken,
    );

    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.authService.generateTokensByUserId(userId);
    await this.authService.updateRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }
}
