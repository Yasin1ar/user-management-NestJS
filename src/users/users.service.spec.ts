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
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from '../dto';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;

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
      jest
        .spyOn(service, 'findOneByUsername')
        .mockRejectedValue(new NotFoundException());
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(service.findOneByUsername).toHaveBeenCalledWith('newuser');
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword',
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should create user with roles when roleIds are provided', async () => {
      const dtoWithRoles = { ...createUserDto, roleIds: [1] };

      jest
        .spyOn(service, 'findOneByUsername')
        .mockRejectedValue(new NotFoundException());
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
      jest.spyOn(service, 'findOneByUsername').mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.findOneByUsername).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when database operation fails', async () => {
      jest
        .spyOn(service, 'findOneByUsername')
        .mockRejectedValue(new NotFoundException());
      jest.spyOn(userRepository, 'create').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
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

  describe('update()', () => {
    const updateDto: UpdateUserDto = { username: 'updated' };

    it('should update user details', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        username: 'updated',
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce({
        ...mockUser,
        username: 'updated',
      });

      const result = await service.update(1, updateDto);

      expect(result.username).toBe('updated');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should check username availability when updating username', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce({
        ...mockUser,
        username: 'oldname',
      });
      jest
        .spyOn(service, 'findOneByUsername')
        .mockRejectedValue(new NotFoundException());
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        username: 'newname',
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce({
        ...mockUser,
        username: 'newname',
      });

      await service.update(1, { username: 'newname' });

      expect(service.findOneByUsername).toHaveBeenCalledWith('newname');
    });

    it('should throw ConflictException when updating to an existing username', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce({
        ...mockUser,
        username: 'oldname',
      });
      jest.spyOn(service, 'findOneByUsername').mockResolvedValue(mockUser);

      await expect(
        service.update(1, { username: 'existingname' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password when updating password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashed');
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        password: 'newhashed',
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce({
        ...mockUser,
        password: 'newhashed',
      });

      await service.update(1, { password: 'newpassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
    });

    it('should update refresh token when provided', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        refreshToken: 'newtoken',
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce({
        ...mockUser,
        refreshToken: 'newtoken',
      });

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
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);

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
      const userWithSensitiveInfo = {
        ...mockUser,
        password: 'secret',
        refreshToken: 'token',
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
