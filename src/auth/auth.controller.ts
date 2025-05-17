import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  Headers,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginUserDto,
  ChangePasswordDto,
  DeleteAccountDto,
  TokensResponseDto,
  UserResponseDto,
} from '../dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
@ApiBearerAuth('access-token')
export class AuthController {
  constructor(private readonly authService: AuthService) {
    this.logger = new Logger(AuthController.name);
  }

  private readonly logger: Logger;

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    type: TokensResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username already exists',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Registration failed due to server error',
  })
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
  @ApiOperation({ summary: 'Log in with username and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged in',
    type: TokensResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User does not exist',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Login failed due to server error',
  })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile returned successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch profile due to server error',
  })
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
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
    description: 'This endpoint is rate limited to 5 requests per minute',
  })
  @ApiHeader({
    name: 'authorization',
    description: 'Bearer refresh_token',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens refreshed successfully',
    type: TokensResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (5 requests per minute)',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to refresh tokens due to server error',
  })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
    type: TokensResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password is incorrect or not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Password change failed due to server error',
  })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'Invalid credentials for account deletion or not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Account deletion failed due to server error',
  })
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
