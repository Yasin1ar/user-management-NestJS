import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '@/dto';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    role: 'user',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
              andWhere: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = {
        username: 'newuser',
        password: 'password',
        role: 'user',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockUser);
      jest.spyOn(repository, 'save').mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create(createUserDto as CreateUserDto);
      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword',
        role: 'user',
      });
    });

    it('should throw ConflictException if username exists', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
      await expect(
        service.create({ username: 'testuser', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const result = await service.findAll(1, 10);
      expect(result.data).toEqual([mockUser]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should find user by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
      const result = await service.findOne(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { username: 'updated' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(repository, 'save')
        .mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await service.update(1, updateDto);
      expect(result.username).toBe('updated');
    });

    it('should hash password if provided', async () => {
      const updateDto = { password: 'newpass' };
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpass');
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'save').mockResolvedValue(mockUser);

      await service.update(1, updateDto);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      jest
        .spyOn(repository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);
      await service.remove(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(repository, 'delete')
        .mockResolvedValue({ affected: 0 } as any);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
