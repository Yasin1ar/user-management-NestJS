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
import { CreateUserDto, UpdateUserDto } from '@/dto';

// mock the whole library
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
    users: []
  };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    isActive: true,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [mockRole]
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
            findOneByUsername: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
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

  describe('create()', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      password: 'password'
    };

    it('should successfully create a new user', async () => {
      jest.spyOn(service, 'findOneByUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create(createUserDto);
      
      expect(result).toEqual(mockUser);
      expect(service.findOneByUsername).toHaveBeenCalledWith({
        where: { username: 'newuser' }
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword',
        isActive: true,
        refreshToken: null,
        roles: undefined
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should create user with roles when roleIds are provided', async () => {
      const dtoWithRoles = { ...createUserDto, roleIds: [1] };
      
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create(dtoWithRoles);
      
      expect(result).toEqual(mockUser);
      expect(roleRepository.findByIds).toHaveBeenCalledWith([1]);
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        roles: [mockRole]
      }));
    });

    it('should throw ConflictException when username already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      
      await expect(service.create(createUserDto))
        .rejects.toThrow(ConflictException);
      expect(userRepository.findOne).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when database operation fails', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.create(createUserDto))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll()', () => {
    it('should return paginated users with default parameters', async () => {
      const result = await service.findAll();
      
      expect(result.data).toEqual([mockUser]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return paginated users with custom parameters', async () => {
      const result = await service.findAll(2, 5);
      
      expect(result.data).toEqual([mockUser]);
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
      jest.spyOn(userRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await service.findAll(1, 10, { search: 'test', role: 'user' });
      
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: 'user' });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.username LIKE :search', {
        search: '%test%'
      });
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
      
      await expect(service.findOne(999))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByUsername()', () => {
    it('should return a user when found by username', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      
      const result = await service.findOneByUsername('testuser');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' }
      });
    });

    it('should throw NotFoundException when username not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.findOneByUsername('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    const updateDto: UpdateUserDto = { username: 'updated' };

    it('should update user details', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, ...updateDto });
      
      const result = await service.update(1, updateDto);
      expect(result.username).toBe('updated');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should hash password when password is provided', async () => {
      const passwordDto = { password: 'newpass' };
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpass');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      
      await service.update(1, passwordDto);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
    });

    it('should update roles when roleIds are provided', async () => {
      const rolesDto = { roleIds: [1] };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        roles: [mockRole]
      });
      
      const result = await service.update(1, rolesDto);
      expect(roleRepository.findByIds).toHaveBeenCalledWith([1]);
      expect(result.roles).toEqual([mockRole]);
    });

    it('should throw ConflictException when updating to existing username', async () => {
      const existingUser = { ...mockUser, id: 2 };
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser) // First call for the user being updated
        .mockResolvedValueOnce(existingUser); // Second call for username check
      
      await expect(service.update(1, { username: 'existing' }))
        .rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.update(999, updateDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('should delete a user successfully', async () => {
      jest.spyOn(userRepository, 'delete').mockResolvedValue({ affected: 1 } as any);
      
      await service.remove(1);
      expect(userRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      jest.spyOn(userRepository, 'delete').mockResolvedValue({ affected: 0 } as any);
      
      await expect(service.remove(999))
        .rejects.toThrow(NotFoundException);
    });
  });
});