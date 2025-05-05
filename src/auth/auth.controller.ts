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
  BadRequestException,
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

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  async signup(@Body() signUpDto: AuthDto) {
    try {
      // Only expect username/password in body
      const tokens = await this.authService.signup(
        signUpDto.username,
        signUpDto.password,
      );
      return tokens; // { accessToken, refreshToken }
    } catch (e) {
      // Show error for test debugging
      throw new BadRequestException(e.message || 'Signup failed');
    }
  }
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Res({ passthrough: true }) res, @Body() loginDto: AuthDto) {
    try {
      const { accessToken, refreshToken } = await this.authService.login(
        loginDto.username,
        loginDto.password,
      );
      return { accessToken, refreshToken };
    } catch (e) {
      throw new BadRequestException(e.message || 'Login failed');
    }
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
