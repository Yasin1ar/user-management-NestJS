import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto';
import { AuthGuard } from './auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;

  beforeEach(async () => {
    authService = {
      signUp: jest.fn(),
      logIn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('signUp', () => {
    it('should call AuthService.signUp and return its result', async () => {
      const dto: AuthDto = { username: 'testuser', password: 'password123' };
      const expected = { id: 1, username: 'testuser', access_token: 'token' };
      (authService.signUp as jest.Mock).mockResolvedValue(expected);

      const result = await controller.signUp(dto);
      expect(authService.signUp).toHaveBeenCalledWith('testuser', 'password123');
      expect(result).toEqual(expected);
    });
  });

  describe('logIn', () => {
    it('should call AuthService.logIn and return its result', async () => {
      const dto: AuthDto = { username: 'testuser', password: 'password123' };
      const expected = { access_token: 'token' };
      (authService.logIn as jest.Mock).mockResolvedValue(expected);

      const result = await controller.logIn(dto);
      expect(authService.logIn).toHaveBeenCalledWith('testuser', 'password123');
      expect(result).toEqual(expected);
    });
  });

  describe('getProfile', () => {
    it('should return req.user', () => {
      const mockUser = { id: 1, username: 'testuser' };
      const req = { user: mockUser };
      const result = controller.getProfile(req);
      expect(result).toBe(mockUser);
    });
  });
});