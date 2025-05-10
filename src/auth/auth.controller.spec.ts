import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokensResponseDto, UserResponseDto } from '../dto';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockTokens: TokensResponseDto = {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  };

  const mockUserResponse: UserResponseDto = {
    id: 1,
    username: 'testuser',
    role: 'user',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            getProfile: jest.fn(),
            refreshTokens: jest.fn(),
            changePassword: jest.fn(),
            deleteAccount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      jest.spyOn(authService, 'register').mockResolvedValue(mockTokens);
      const result = await controller.register({
        username: 'newuser',
        password: 'password',
        role: 'user',
      });
      expect(result).toEqual(mockTokens);
      expect(authService.register).toHaveBeenCalled();
    });

    it('should throw BadRequestException when registration fails', async () => {
      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new BadRequestException());
      await expect(controller.register({} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue(mockTokens);
      const result = await controller.login({
        username: 'test',
        password: 'test',
      });
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new UnauthorizedException());
      await expect(controller.login({} as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUserResponse);
      const result = await controller.getProfile(1);
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest
        .spyOn(authService, 'getProfile')
        .mockRejectedValue(new NotFoundException());
      await expect(controller.getProfile(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      jest.spyOn(authService, 'refreshTokens').mockResolvedValue(mockTokens);
      const result = await controller.refresh('Bearer refresh_token');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jest
        .spyOn(authService, 'refreshTokens')
        .mockRejectedValue(new UnauthorizedException());
      await expect(controller.refresh('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      jest.spyOn(authService, 'changePassword').mockResolvedValue(mockTokens);
      const result = await controller.changePassword(1, {
        currentPassword: 'old',
        newPassword: 'new',
      });
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      jest
        .spyOn(authService, 'changePassword')
        .mockRejectedValue(new UnauthorizedException());
      await expect(controller.changePassword(1, {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', async () => {
      jest.spyOn(authService, 'deleteAccount').mockResolvedValue(undefined);
      await expect(
        controller.deleteAccount(1, {
          password: 'pass',
          confirmation: 'DELETE',
        }),
      ).resolves.not.toThrow();
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest
        .spyOn(authService, 'deleteAccount')
        .mockRejectedValue(new UnauthorizedException());
      await expect(controller.deleteAccount(1, {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // Test Public decorator
  it('should have Public decorator on register, login, and refresh', () => {
    expect(
      Reflect.getMetadata('isPublic', AuthController.prototype.register),
    ).toBe(true);
    expect(
      Reflect.getMetadata('isPublic', AuthController.prototype.login),
    ).toBe(true);
    expect(
      Reflect.getMetadata('isPublic', AuthController.prototype.refresh),
    ).toBe(true);
  });
});
