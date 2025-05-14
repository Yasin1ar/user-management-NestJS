import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../users/user.entity';
import { Role } from '../users/role.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, LoginUserDto, ChangePasswordDto, DeleteAccountDto } from '../dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockRole: Role = {
    id: 1,
    name: 'user',
    description: 'Regular user',
    permissions: [],
    users: []
  };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    isActive: true,
    refreshToken: 'test-refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [mockRole]
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findOneByUsername: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset environment variables for tests
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        password: 'password',
        roleIds: [1]
      };

      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('access_token');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('refresh_token');
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'findOne').mockResolvedValue({
        ...mockUser,
        refreshToken: 'refresh_token',
      });

      const result = await service.register(createUserDto);
      
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException if username exists', async () => {
      jest.spyOn(usersService, 'create').mockRejectedValue(new ConflictException());
      
      await expect(
        service.register({ username: 'existing', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      jest.spyOn(usersService, 'create').mockRejectedValue(new Error());
      
      await expect(
        service.register({ username: 'test', password: 'pass' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      const loginDto: LoginUserDto = {
        username: 'testuser',
        password: 'password',
      };

      jest.spyOn(usersService, 'findOneByUsername').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('access_token');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('refresh_token');
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'findOne').mockResolvedValue({
        ...mockUser,
        refreshToken: 'refresh_token',
      });

      const result = await service.login(loginDto);
      
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(usersService.findOneByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedpassword');
    });

    it('should throw UnauthorizedException for invalid credentials - user not found', async () => {
      jest.spyOn(usersService, 'findOneByUsername').mockRejectedValue(new NotFoundException(
        'User with username testuser not found'));
      
      await expect(
        service.login({ username: 'nonexistent', password: 'pass' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for invalid credentials - wrong password', async () => {
      jest.spyOn(usersService, 'findOneByUsername').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await expect(
        service.login({ username: 'testuser', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive information', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      
      const result = await service.getProfile(1);
      
      // Ensure password and refreshToken are not included
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      
      // Check other expected properties
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('roles');
      // expect(result.roles[0]).toHaveProperty('name', 'user');
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersService, 'findOne').mockRejectedValue(new NotFoundException(
        'User with username testuser not found'));      
      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const authHeader = 'Bearer refresh_token';
      const payload = { sub: 1, username: 'testuser' };
      
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);
      jest.spyOn(usersService, 'findOne').mockResolvedValue({
        ...mockUser,
        refreshToken: 'refresh_token',
      });
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('new_access_token');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('new_refresh_token');
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      
      const result = await service.refreshTokens(authHeader);
      
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh_token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException for invalid auth header', async () => {
      await expect(service.refreshTokens('InvalidHeader')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 999 });
      jest.spyOn(usersService, 'findOne').mockRejectedValue(new UnauthorizedException('User not found'));      
      await expect(service.refreshTokens('Bearer valid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 1 });
      jest.spyOn(usersService, 'findOne').mockResolvedValue({
        ...mockUser,
        refreshToken: 'different_token',
      });
      
      await expect(service.refreshTokens('Bearer valid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'current',
      newPassword: 'new',
    };

    it('should change password and return new tokens', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('new_access_token');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('new_refresh_token');
      
      const result = await service.changePassword(1, changePasswordDto);
      
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
      expect(usersService.update).toHaveBeenCalledWith(1, {
        password: 'new_hashed_password',
      });
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersService, 'findOne').mockRejectedValue(new UnauthorizedException)      
      await expect(
        service.changePassword(999, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteAccount', () => {
    const deleteAccountDto: DeleteAccountDto = {
      password: 'password',
      confirmation: 'DELETE',
    };

    it('should delete user account', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(usersService, 'remove').mockResolvedValue(undefined);
      
      await expect(
        service.deleteAccount(1, deleteAccountDto),
      ).resolves.not.toThrow();
      expect(usersService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await expect(service.deleteAccount(1, deleteAccountDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersService, 'findOne').mockRejectedValue(new NotFoundException)      
      
      await expect(service.deleteAccount(999, deleteAccountDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('access_token');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('refresh_token');
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'findOne').mockResolvedValue({
        ...mockUser,
        refreshToken: 'refresh_token',
      });
      
      // Using private method via any type casting
      const result = await (service as any).generateTokens(mockUser);
      
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(usersService.update).toHaveBeenCalledWith(1, {
        refreshToken: 'refresh_token',
      });
    });
  });

  describe('storeRefreshToken', () => {
    it('should store refresh token', async () => {
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'findOne').mockResolvedValue({
        ...mockUser,
        refreshToken: 'new_token',
      });
      
      // Using private method via any type casting
      await expect(
        (service as any).storeRefreshToken(1, 'new_token'),
      ).resolves.not.toThrow();
      expect(usersService.update).toHaveBeenCalledWith(1, {
        refreshToken: 'new_token',
      });
    });

    it('should throw InternalServerErrorException if update fails', async () => {
      jest.spyOn(usersService, 'findOne').mockRejectedValue(new NotFoundException)      
      
      // Using private method via any type casting
      await expect(
        (service as any).storeRefreshToken(1, 'new_token'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException if token verification fails', async () => {
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'findOne').mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });
      
      // Using private method via any type casting
      await expect(
        (service as any).storeRefreshToken(1, 'new_token'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});