
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Repository } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from '../dto';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let mockLogger: Partial<Logger>;

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

  beforeEach(async () => {
    // Create a mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
            })),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findByIds: jest.fn().mockResolvedValue([mockRole]),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    
    // Override the logger with our mock
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      password: 'password',
    };

    it('should successfully create a new user', async () => {
      // Simulate username not taken
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'newuser' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword',
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should create user with roles when roleIds are provided', async () => {
      const dtoWithRoles = { ...createUserDto, roleIds: [1] };

      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(userRepository, 'create').mockReturnValue({
        ...mockUser,
        roles: [],
      });
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      jest.spyOn(roleRepository, 'findByIds').mockResolvedValue([mockRole]);

      const result = await service.create(dtoWithRoles);

      expect(result).toEqual(mockUser);
      expect(roleRepository.findByIds).toHaveBeenCalledWith([1]);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [mockRole],
        }),
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      // Simulate username exists
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'newuser' },
      });
    });

    it('should throw InternalServerErrorException when database operation fails', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(userRepository, 'create').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      
      // Verify the error was logged
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('should return paginated users with default parameters', async () => {
      const result = await service.findAll();

      expect(result.data).toEqual([
        {
          id: 1,
          username: 'testuser',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          roles: [mockRole],
        },
      ]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return paginated users with custom parameters', async () => {
      const result = await service.findAll(2, 5);

      expect(result.data).toEqual([
        {
          id: 1,
          username: 'testuser',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          roles: [mockRole],
        },
      ]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('should apply filters when provided', async () => {
      const queryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      jest
        .spyOn(userRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      await service.findAll(1, 10, { search: 'test', role: 'user' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: 'user',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.username LIKE :search',
        {
          search: '%test%',
        },
      );
    });
  });

  describe('findOne()', () => {
    it('should return a user when found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findOne(1);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByUsername()', () => {
    it('should return a user when found by username', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findOneByUsername('testuser');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should throw NotFoundException when username not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOneByUsername('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUserByUsernameOptional()', () => {
    it('should return a user when found by username', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findUserByUsernameOptional('testuser');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when username not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findUserByUsernameOptional('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('update()', () => {
    const updateDto: UpdateUserDto = { username: 'updated' };

    it('should update user details', async () => {
      const updatedUser = { ...mockUser, username: 'updated' };
      
      // First find the user by ID
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser) // For the initial findOne(id)
        .mockResolvedValueOnce(null)     // For the findUserByUsernameOptional check (username is free)
        .mockResolvedValueOnce(updatedUser); // For verification after save
      
      jest.spyOn(userRepository, 'save').mockResolvedValue(updatedUser);

      const result = await service.update(1, { username: 'updated' });

      expect(result.username).toBe('updated');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should check username availability when updating username', async () => {
      const currentUser = { ...mockUser, username: 'oldname' };
      const updatedUser = { ...mockUser, username: 'newname' };
      
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(currentUser) // For finding user by ID
        .mockResolvedValueOnce(null)        // For username availability check
        .mockResolvedValueOnce(updatedUser); // For verification
      
      jest.spyOn(userRepository, 'save').mockResolvedValue(updatedUser);

      await service.update(1, { username: 'newname' });

      // First call is to find the user
      // Second call is to check if the new username is already taken
      expect(userRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { username: 'newname' },
      });
    });

    it('should throw ConflictException when updating to an existing username', async () => {
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce({ ...mockUser, username: 'oldname' }) // Current user
        .mockResolvedValueOnce(mockUser); // New username already exists
      
      await expect(
        service.update(1, { username: 'existingname' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password when updating password', async () => {
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser) // For findOne(id)
        .mockResolvedValueOnce({ ...mockUser, password: 'newhashed' }); // For verification
      
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashed');
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        password: 'newhashed',
      });

      await service.update(1, { password: 'newpassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
    });

    it('should update refresh token when provided', async () => {
      const updatedUser = { ...mockUser, refreshToken: 'newtoken' };
      
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser) // For findOne(id)
        .mockResolvedValueOnce(updatedUser); // For verification
      
      jest.spyOn(userRepository, 'save').mockResolvedValue(updatedUser);

      await service.update(1, { refreshToken: 'newtoken' });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: 'newtoken',
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw an error if verification after update fails', async () => {
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser) // First call to find user
        .mockResolvedValueOnce(null); // Second call for verification - fails
      
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        'Failed to verify user update',
      );
    });
  });

  describe('remove()', () => {
    it('should remove a user', async () => {
      jest
        .spyOn(userRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(userRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found for deletion', async () => {
      jest
        .spyOn(userRepository, 'delete')
        .mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toUserResponseDto()', () => {
    it('should remove sensitive information from user object', () => {
      // Create a fresh user object specifically for this test to avoid state issues
      const userWithSensitiveInfo = {
        id: 1,
        username: 'testuser',  // Make sure this matches the expected value
        password: 'secret',
        refreshToken: 'token',
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [mockRole],
      };

      // Access private method using type casting
      const result = (service as any).toUserResponseDto(userWithSensitiveInfo);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('roles');
    });
  });

  describe('hashPassword()', () => {
    it('should hash a password with bcrypt', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedvalue');

      // Access private method using type casting
      const result = await (service as any).hashPassword('password');

      expect(result).toBe('hashedvalue');
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
    });
  });
});
