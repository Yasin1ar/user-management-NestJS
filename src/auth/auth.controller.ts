import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  TokensResponseDto,
  CreateUserDto,
  LoginUserDto,
  ChangePasswordDto,
  DeleteAccountDto,
  UserResponseDto,
} from '../dto';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
    this.logger = new Logger(AuthController.name);
  }

  private readonly logger: Logger;
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: CreateUserDto,
  ): Promise<TokensResponseDto> {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Registration failed');
    }
  }
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginUserDto): Promise<TokensResponseDto> {
    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Invalid credentials');
      } else if (error instanceof NotFoundException) {
        throw new NotFoundException('User does not exist');
      }
      throw new InternalServerErrorException('Login failed');
    }
  }

  @Get('profile')
  async getProfile(@CurrentUser() userId: number): Promise<UserResponseDto> {
    try {
      return await this.authService.getProfile(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('User not found');
      }
      throw new InternalServerErrorException('Failed to fetch profile');
    }
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('refresh')
  async refresh(
    @Headers('authorization') authHeader: string,
  ): Promise<TokensResponseDto> {
    try {
      return await this.authService.refreshTokens(authHeader);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw new InternalServerErrorException('Failed to refresh tokens');
    }
  }

  @Patch('change-password')
  async changePassword(
    @CurrentUser() userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<TokensResponseDto> {
    try {
      return await this.authService.changePassword(userId, changePasswordDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      throw new InternalServerErrorException('Password change failed');
    }
  }

  @Delete('delete-account')
  async deleteAccount(
    @CurrentUser() userId: number,
    @Body() deleteAccountDto: DeleteAccountDto,
  ): Promise<void> {
    try {
      return await this.authService.deleteAccount(userId, deleteAccountDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(
          'Invalid credentials for account deletion',
        );
      }
      throw new InternalServerErrorException('Account deletion failed');
    }
  }
}
