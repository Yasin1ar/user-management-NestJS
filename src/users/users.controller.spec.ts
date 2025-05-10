import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserResponseDto } from '../dto';
import { Reflector } from '@nestjs/core';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserResponse: UserResponseDto = {
    id: 1,
    username: 'testuser',
    role: 'user',
    createdAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockUserResponse],
    total: 1,
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockUserResponse),
            findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
            findOne: jest.fn().mockResolvedValue(mockUserResponse),
            update: jest.fn().mockResolvedValue(mockUserResponse),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const result = await controller.create({
        username: 'test',
        password: 'pass',
      });
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const result = await controller.findAll(1, 10);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      const result = await controller.findOne(1);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const result = await controller.update(1, { username: 'updated' });
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      await expect(controller.remove(1)).resolves.not.toThrow();
    });
  });

  // Test Roles decorator
  it('should have Roles decorator with admin role', () => {
    const roles = Reflect.getMetadata('roles', UsersController);
    expect(roles).toEqual(['admin']);
  });
});
