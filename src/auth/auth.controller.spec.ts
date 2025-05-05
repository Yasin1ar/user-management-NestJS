import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './guards/auth.guard';
import { AuthDto } from './auth.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let jwtService: JwtService;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    verifyRefreshToken: jest.fn(),
    generateTokensByUserId: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should call authService.signup and return tokens', async () => {
      const dto: AuthDto = { username: 'user', password: 'password123' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      mockAuthService.signup.mockResolvedValue(tokens);

      const result = await controller.signup(dto);

      expect(authService.signup).toHaveBeenCalledWith(
        dto.username,
        dto.password,
      );
      expect(result).toEqual(tokens);
    });
  });

  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto: AuthDto = { username: 'user', password: 'password123' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      mockAuthService.login.mockResolvedValue(tokens);

      // Mock response object with passthrough
      const res = {};

      const result = await controller.login(res, dto);

      expect(authService.login).toHaveBeenCalledWith(
        dto.username,
        dto.password,
      );
      expect(result).toEqual(tokens);
    });
  });

  describe('getProfile', () => {
    it('should return req.user', () => {
      const req = { user: { id: 1, username: 'user' } };
      const result = controller.getProfile(req);
      expect(result).toEqual(req.user);
    });
  });

  describe('refresh', () => {
    const userId = 42;
    const refreshToken = 'refresh-token';
    const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

    it('should throw if no authorization header', async () => {
      await expect(controller.refresh('')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.refresh('Basic something')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if jwtService.verifyAsync fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(controller.refresh('Bearer badtoken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if verifyRefreshToken returns false', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: userId });
      mockAuthService.verifyRefreshToken.mockResolvedValue(false);

      await expect(
        controller.refresh(`Bearer ${refreshToken}`),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens if refresh is valid', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: userId });
      mockAuthService.verifyRefreshToken.mockResolvedValue(true);
      mockAuthService.generateTokensByUserId.mockResolvedValue(tokens);
      mockAuthService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await controller.refresh(`Bearer ${refreshToken}`);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken);
      expect(authService.verifyRefreshToken).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
      expect(authService.generateTokensByUserId).toHaveBeenCalledWith(userId);
      expect(authService.updateRefreshToken).toHaveBeenCalledWith(
        userId,
        tokens.refreshToken,
      );
      expect(result).toEqual(tokens);
    });
  });
});
