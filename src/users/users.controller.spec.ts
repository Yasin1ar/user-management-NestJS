import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import {
  NotFoundException,
  ConflictException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { User } from './user.entity';
import { Role } from './role.entity';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockRole: Role = {
    id: 1,
    name: 'user',
    description: 'Regular user',
    permissions: [],
    users: [],
  };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [mockRole],
  };

  const mockUserResponse: UserResponseDto = {
    id: 1,
    username: 'testuser',
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
    roles: [mockRole],
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        password: 'password',
        roleIds: [1],
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        createdAt: mockUser.createdAt,
      });
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException when username exists', async () => {
      jest.spyOn(service, 'create').mockRejectedValue(new ConflictException());

      await expect(
        controller.create({ username: 'existing', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(1, 10);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should use default pagination values when not provided', async () => {
      // Create mocks for the pipe transformations that would happen in a real request
      const defaultValuePipe = new DefaultValuePipe(1);
      const parseIntPipe = new ParseIntPipe();

      // When no params are sent, the DefaultValuePipe provides defaults
      const defaultPage = await defaultValuePipe.transform(undefined, {
        type: 'query',
        metatype: Number,
        data: 'page',
      });
      const defaultLimit = await defaultValuePipe.transform(undefined, {
        type: 'query',
        metatype: Number,
        data: 'limit',
      });

      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(defaultPage, defaultLimit);

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        createdAt: mockUser.createdAt,
      });
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = { username: 'updated' };

    it('should update and return a user', async () => {
      const updatedUser = {
        ...mockUser,
        username: 'updated',
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update(1, updateUserDto);

      expect(result).toEqual({
        id: updatedUser.id,
        username: updatedUser.username,
        createdAt: updatedUser.createdAt,
      });
      expect(service.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException());

      await expect(controller.update(999, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when updating to existing username', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new ConflictException());

      await expect(
        controller.update(1, { username: 'existing' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await expect(controller.remove(1)).resolves.not.toThrow();
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when removing non-existent user', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException());

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toUserResponseDto', () => {
    it('should remove sensitive information from user object', () => {
      const result = (controller as any).toUserResponseDto(mockUser);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('createdAt');
    });
  });
});
