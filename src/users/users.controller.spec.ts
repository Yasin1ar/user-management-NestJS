import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    role: 'user',
  };

  const usersArray: User[] = [
    mockUser,
    { id: 2, username: 'another', password: 'pass', role: 'admin' },
  ];

  const mockUsersService = {
    create: jest.fn().mockResolvedValue(mockUser),
    findAll: jest.fn().mockResolvedValue(usersArray),
    findOne: jest.fn().mockResolvedValue(mockUser),
    remove: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(mockUser),
  };

  // Mock guards to always allow
  const mockGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call usersService.create and return the result', async () => {
      const dto = {
        username: 'testuser',
        password: 'hashedpassword',
      } as User;
      await expect(controller.create(dto)).resolves.toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      await expect(controller.findAll()).resolves.toEqual(usersArray);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      await expect(controller.findOne('1')).resolves.toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('remove', () => {
    it('should call usersService.remove with the correct id', async () => {
      await expect(controller.remove('1')).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call usersService.update and return the updated user', async () => {
      const updateDto = {
        username: 'updated',
        password: 'newpass',
        role: 'admin',
      } as User;
      await expect(controller.update('1', updateDto)).resolves.toEqual(
        mockUser,
      );
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });
});
