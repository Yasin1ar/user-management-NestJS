import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should log in successfully with correct credentials', async () => {
    (usersService.findOne as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'andrew',
      password: 'tate',
    });
    const result = await authService.logIn('andrew', 'tate');
    expect(result).toEqual({ access_token: 'mocked-token' });
  });

  it('should throw UnauthorizedException with wrong password', async () => {
    (usersService.findOne as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'andrew',
      password: 'tate',
    });
    await expect(authService.logIn('andrew', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should sign up and return token without password', async () => {
    (usersService.create as jest.Mock).mockResolvedValue({
      id: 2,
      username: 'cobra',
      password: 'secret',
    });
    const result = await authService.signUp('cobra', 'secret');
    expect(result).toEqual({
      id: 2,
      username: 'cobra',
      access_token: 'mocked-token',
    });
    expect(result).not.toHaveProperty('password');
  });
});
