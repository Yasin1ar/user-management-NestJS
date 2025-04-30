import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  // Mock user data
  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'password123',
    role: 'user' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const userData = {
      username: 'newuser',
      password: 'pass',
      role: 'user' as const,
    };
    const createdUser = { ...userData, id: 1 };

    jest.spyOn(service, 'create').mockResolvedValue(createdUser);

    expect(await controller.create(userData as User)).toEqual(createdUser);
    expect(service.create).toHaveBeenCalledWith(userData);
  });

  it('should find all users', async () => {
    const users: User[] = [
      mockUser,
      { id: 2, username: 'admin', password: 'pass', role: 'admin' as const },
    ];

    jest.spyOn(service, 'findAll').mockResolvedValue(users);

    expect(await controller.findAll()).toEqual(users);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should find one user by id', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(mockUser);

    expect(await controller.findOne('1')).toEqual(mockUser);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('should return null when user not found', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(null);

    expect(await controller.findOne('999')).toBeNull();
    expect(service.findOne).toHaveBeenCalledWith(999);
  });

  it('should update a user', async () => {
    const updateData = { username: 'updated' };
    const updatedUser = { ...mockUser, ...updateData };

    jest.spyOn(service, 'update').mockResolvedValue(updatedUser);

    expect(await controller.update('1', updateData as User)).toEqual(
      updatedUser,
    );
    expect(service.update).toHaveBeenCalledWith(1, updateData);
  });

  it('should remove a user', async () => {
    jest.spyOn(service, 'remove').mockResolvedValue(undefined);

    await controller.remove('1');
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});
