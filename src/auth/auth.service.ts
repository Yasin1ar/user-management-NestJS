import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  LoginUserDto,
  ChangePasswordDto,
  DeleteAccountDto,
  TokensResponseDto,
  UserResponseDto,
} from '../dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {
    this.logger = new Logger(AuthService.name);
  }

  private readonly logger: Logger;

  private toUserResponseDto(user: User): UserResponseDto {
    const { password, refreshToken, ...userResponse } = user;
    return userResponse;
  }

  async register(createUserDto: CreateUserDto): Promise<TokensResponseDto> {
    try {
      this.logger.log(`Registering new user: ${createUserDto.username}`);
      const user = await this.userService.create(createUserDto);
      return this.generateTokens(user);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(error);

      throw new InternalServerErrorException('Registration failed');
    }
  }

  async login(loginDto: LoginUserDto): Promise<TokensResponseDto> {
    try {
      const { username, password } = loginDto;
      // Find user
      const user = await this.userService.findOneByUsername(username);
      // Validate user and password
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      return this.generateTokens(user);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(error);
      throw new InternalServerErrorException('Login failed');
    }
  }

  async getProfile(userId: number): Promise<UserResponseDto> {
    try {
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return this.toUserResponseDto(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(error);

      throw new InternalServerErrorException('Failed to fetch profile');
    }
  }

  async refreshTokens(authHeader: string): Promise<TokensResponseDto> {
    try {
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Invalid authorization header');
      }

      const refreshToken = authHeader.split(' ')[1];
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify the refresh token matches the stored one
      if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Clear the old refresh token
      await this.clearRefreshToken(user.id);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        this.logger.error(error);
        throw new InternalServerErrorException('Failed to refresh tokens');
      }
    }
  }

  async clearRefreshToken(userId: number): Promise<void> {
    try {
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.userService.update(userId, { refreshToken: null });
      this.logger.log(`Cleared refresh token for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to clear refresh token for user ${userId}: ${error.message}`,
      );
      this.logger.error(error);

      throw new InternalServerErrorException('Failed to clear refresh token');
    }
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<TokensResponseDto> {
    try {
      const { currentPassword, newPassword } = changePasswordDto;

      const user = await this.userService.findOne(userId);

      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await this.userService.update(userId, { password: hashedNewPassword });

      // Clear refresh token when password is changed
      await this.clearRefreshToken(userId);

      const updatedUser = await this.userService.findOne(userId);
      return this.generateTokens(updatedUser);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(error);

      throw new InternalServerErrorException('Password change failed');
    }
  }

  async deleteAccount(
    userId: number,
    deleteAccountDto: DeleteAccountDto,
  ): Promise<void> {
    try {
      const { password } = deleteAccountDto;

      const user = await this.userService.findOne(userId);

      if (! await bcrypt.compare(password, user.password)) {
        throw new UnauthorizedException(
          'Invalid credentials for account deletion',
        );
      }

      await this.userService.remove(userId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      
      } else if (error instanceof NotFoundException) {
        throw error;

      } else {
        this.logger.error(error);
        throw new InternalServerErrorException('Account deletion failed');
      }
    }
  }

  private async generateTokens(user: User): Promise<TokensResponseDto> {
    this.logger.log(`Generating tokens for user ${user.id}`);
    const payload = {
      sub: user.id,
      username: user.username,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    this.logger.log(
      `Tokens generated for user ${user.id}, storing refresh token...`,
    );
    // Store refresh token in database
    await this.storeRefreshToken(user.id, refreshToken);
    this.logger.log(`Refresh token stored successfully for user ${user.id}`);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    try {
      this.logger.log(`Attempting to store refresh token for user ${userId}`);

      // Update the user with the new refresh token
      const updatedUser = await this.userService.update(userId, {
        refreshToken,
      });

      if (!updatedUser) {
        throw new Error('Failed to update user with refresh token');
      }

      // Verify the token was stored
      const user = await this.userService.findOne(userId);

      if (!user?.refreshToken) {
        throw new Error('Refresh token was not stored properly');
      }

      this.logger.log(`Successfully stored refresh token for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store refresh token for user ${userId}: ${error.message}`,
      );
      this.logger.error(error);

      throw new InternalServerErrorException('Failed to store refresh token');
    }
  }
}
