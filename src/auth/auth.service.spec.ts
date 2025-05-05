
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create user, generate tokens, and store refresh token', async () => {
      const user = { id: 1, username: 'test', password: 'pw' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      (usersService.create as jest.Mock).mockResolvedValue(user);
      jest.spyOn(authService, 'generateTokensByUserId').mockResolvedValue(tokens);
      jest.spyOn(authService, 'storeRefreshToken').mockResolvedValue(undefined);

      const result = await authService.signup('test', 'pw');
      expect(usersService.create).toHaveBeenCalledWith({ username: 'test', password: 'pw' });
      expect(authService.generateTokensByUserId).toHaveBeenCalledWith(user.id);
      expect(authService.storeRefreshToken).toHaveBeenCalledWith(user.id, tokens.refreshToken);
      expect(result).toBe(tokens);
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const user = { id: 2, username: 'foo', password: 'bar' };
      const tokens = { accessToken: 'a', refreshToken: 'r' };
      (usersService.findOne as jest.Mock).mockResolvedValue(user);
      jest.spyOn(authService, 'generateTokensByUserId').mockResolvedValue(tokens);
      jest.spyOn(authService, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await authService.login('foo', 'bar');
      expect(usersService.findOne).toHaveBeenCalledWith({ username: 'foo' });
      expect(authService.generateTokensByUserId).toHaveBeenCalledWith(user.id);
      expect(authService.updateRefreshToken).toHaveBeenCalledWith(user.id, tokens.refreshToken);
      expect(result).toBe(tokens);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue({ id: 3, username: 'baz', password: 'pw' });
      await expect(authService.login('baz', 'wrong')).rejects.toThrow(UnauthorizedException);
      (usersService.findOne as jest.Mock).mockResolvedValue(null);
      await expect(authService.login('baz', 'pw')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokensByUserId', () => {
    it('should generate access and refresh tokens', async () => {
      const user = { id: 4, username: 'bob' };
      (usersService.findOne as jest.Mock).mockResolvedValue(user);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.generateTokensByUserId(user.id);
      expect(usersService.findOne).toHaveBeenCalledWith({ id: user.id });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);
      await expect(authService.generateTokensByUserId(999)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('storeRefreshToken', () => {
    it('should hash and store refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (usersService.update as jest.Mock).mockResolvedValue(undefined);

      await authService.storeRefreshToken(1, 'refresh');
      expect(bcrypt.hash).toHaveBeenCalledWith('refresh', 10);
      expect(usersService.update).toHaveBeenCalledWith(1, { refreshToken: 'hashed' });
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return true if refresh token matches', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue({ id: 1, refreshToken: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyRefreshToken(1, 'refresh');
      expect(result).toBe(true);
    });

    it('should return false if user or refreshToken not found', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);
      const result = await authService.verifyRefreshToken(1, 'refresh');
      expect(result).toBe(false);

      (usersService.findOne as jest.Mock).mockResolvedValue({ id: 1, refreshToken: null });
      const result2 = await authService.verifyRefreshToken(1, 'refresh');
      expect(result2).toBe(false);
    });
  });

  describe('updateRefreshToken', () => {
    it('should hash and update refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed2');
      (usersService.update as jest.Mock).mockResolvedValue(undefined);

      await authService.updateRefreshToken(2, 'refresh2');
      expect(bcrypt.hash).toHaveBeenCalledWith('refresh2', 10);
      expect(usersService.update).toHaveBeenCalledWith(2, { refreshToken: 'hashed2' });
    });
  });

  describe('removeRefreshToken', () => {
    it('should set refreshToken to null', async () => {
      (usersService.update as jest.Mock).mockResolvedValue(undefined);

      await authService.removeRefreshToken(3);
      expect(usersService.update).toHaveBeenCalledWith(3, { refreshToken: null });
    });
  });
});
