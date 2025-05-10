import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { CreateUserDto, DeleteAccountDto } from '../dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedPassword',
    role: 'user',
    refreshToken: 'oldRefreshToken',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    findOneByUsername: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('register', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      password: 'password123',
      role: 'user' as const,
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    });

    it('should successfully register a new user and return tokens', async () => {
      // Arrange
      const newUser = { ...mockUser, id: 2, username: createUserDto.username };
      mockUsersService.create.mockImplementation(async (dto) => {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        return { ...newUser, password: hashedPassword };
      });

      // Mock the token storage flow
      mockUsersService.update.mockResolvedValueOnce({
        ...newUser,
        refreshToken: 'newRefreshToken',
      }); // First call: store refresh token
      mockUsersService.findOne.mockResolvedValueOnce({
        ...newUser,
        refreshToken: 'newRefreshToken',
      }); // Verify token storage

      mockJwtService.signAsync.mockResolvedValue('newToken');

      // Act
      const result = await service.register(createUserDto);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      expect(mockUsersService.update).toHaveBeenCalledWith(newUser.id, {
        refreshToken: 'newToken',
      });
      expect(mockUsersService.findOne).toHaveBeenCalledWith(newUser.id);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      mockUsersService.create.mockRejectedValue(
        new ConflictException('Username already exists'),
      );

      // Act & Assert
      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if validation fails', async () => {
      // Arrange
      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Invalid input'),
      );

      // Act & Assert
      await expect(service.register(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException if registration fails', async () => {
      // Arrange
      mockUsersService.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.register(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getProfile', () => {
    const userId = 1;

    it('should return user profile without sensitive data', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getProfile(userId);

      // Assert
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('username', mockUser.username);
      expect(result).toHaveProperty('role', mockUser.role);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if profile fetch fails', async () => {
      // Arrange
      mockUsersService.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getProfile(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteAccount', () => {
    const userId = 1;
    const deleteAccountDto: DeleteAccountDto = {
      password: 'currentPassword',
      confirmation: 'DELETE',
    };

    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockImplementation((pass, hash) => {
        if (pass === deleteAccountDto.password && hash === mockUser.password)
          return true;
        return false;
      });
    });

    it('should successfully delete user account', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.remove.mockResolvedValue(true);

      // Act
      await service.deleteAccount(userId, deleteAccountDto);

      // Assert
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        deleteAccountDto.password,
        mockUser.password,
      );
      expect(mockUsersService.remove).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.deleteAccount(userId, deleteAccountDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteAccount(userId, deleteAccountDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw InternalServerErrorException if account deletion fails', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.remove.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.deleteAccount(userId, deleteAccountDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('changePassword', () => {
    const userId = 1;
    const currentPassword = 'currentPassword';
    const newPassword = 'newPassword';
    const hashedNewPassword = 'hashedNewPassword';

    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockImplementation((pass, hash) => {
        if (pass === currentPassword && hash === mockUser.password) return true;
        return false;
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedNewPassword);
    });

    it('should successfully change password and return new tokens', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.update
        .mockResolvedValueOnce({ ...mockUser, password: hashedNewPassword }) // First call: update password
        .mockResolvedValueOnce({ ...mockUser, refreshToken: null }) // Second call: clear refresh token
        .mockResolvedValueOnce({ ...mockUser, refreshToken: 'newToken' }); // Third call: store new refresh token
      mockJwtService.signAsync.mockResolvedValue('newToken');

      // Act
      const result = await service.changePassword(userId, {
        currentPassword,
        newPassword,
      });

      // Assert
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        currentPassword,
        mockUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);

      // Verify all update calls
      expect(mockUsersService.update).toHaveBeenCalledTimes(3);
      expect(mockUsersService.update).toHaveBeenNthCalledWith(1, userId, {
        password: hashedNewPassword,
      });
      expect(mockUsersService.update).toHaveBeenNthCalledWith(2, userId, {
        refreshToken: null,
      });
      expect(mockUsersService.update).toHaveBeenNthCalledWith(3, userId, {
        refreshToken: 'newToken',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword(userId, {
          currentPassword: 'wrongPassword',
          newPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword(userId, {
          currentPassword,
          newPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw InternalServerErrorException if password update fails', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword(userId, {
          currentPassword,
          newPassword,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('login', () => {
    const username = 'testuser';
    const password = 'password';

    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockImplementation((pass, hash) => {
        if (pass === password && hash === mockUser.password) return true;
        return false;
      });
    });

    it('should successfully login and return tokens', async () => {
      // Arrange
      mockUsersService.findOneByUsername.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'newRefreshToken',
      });
      mockJwtService.signAsync.mockResolvedValue('newToken');

      // Act
      const result = await service.login({ username, password });

      // Assert
      expect(mockUsersService.findOneByUsername).toHaveBeenCalledWith(username);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      // Arrange
      mockUsersService.findOneByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.login({ username, password: 'wrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    const refreshToken = 'validRefreshToken';
    const authHeader = `Bearer ${refreshToken}`;

    beforeEach(() => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });
    });

    it('should successfully refresh tokens', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken,
      });
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'newRefreshToken',
      });
      mockJwtService.signAsync.mockResolvedValue('newToken');

      // Act
      const result = await service.refreshTokens(authHeader);

      // Assert
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );

      // Act & Assert
      await expect(service.refreshTokens(authHeader)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if stored refresh token does not match', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: 'differentToken',
      });

      // Act & Assert
      await expect(service.refreshTokens(authHeader)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
