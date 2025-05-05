import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { ConflictException } from '@nestjs/common';

// Create a fresh mock for each test to avoid state leakage
const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    repository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [{ id: 1, username: 'a', password: 'b', role: 'user' }];
      repository.find.mockResolvedValue(users);

      const result = await service.findAll();
      expect(result).toEqual(users);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find by id', async () => {
      const user = { id: 1, username: 'a', password: 'b', role: 'user' };
      repository.findOne.mockResolvedValue(user);

      const result = await service.findOne({ id: 1 });
      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should find by username', async () => {
      const user = { id: 2, username: 'b', password: 'c', role: 'user' };
      repository.findOne.mockResolvedValue(user);

      const result = await service.findOne({ username: 'b' });
      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { username: 'b' },
      });
    });

    it('should throw if neither id nor username is provided', async () => {
      await expect(service.findOne({})).rejects.toThrow(
        'Either id or username must be provided',
      );
    });
  });

  describe('remove', () => {
    it('should call repository.delete', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });
      await service.remove(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if username exists', async () => {
      repository.findOne.mockResolvedValue({ id: 1, username: 'taken' });

      await expect(
        service.create({ username: 'taken', password: 'pw' }),
      ).rejects.toThrow(ConflictException);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { username: 'taken' },
      });
    });

    it('should create and save user if username is unique', async () => {
      const userData = {
        username: 'unique',
        password: 'pw',
        role: 'user' as const,
      };
      const createdUser = { ...userData, id: 2 };
      repository.findOne.mockResolvedValue(undefined);
      repository.create.mockReturnValue(userData);
      repository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);
      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(userData);
      expect(result).toEqual(createdUser);
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updatedUser = {
        id: 1,
        username: 'new',
        password: 'pw',
        role: 'user' as const,
      };
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOne.mockResolvedValue(updatedUser);

      const result = await service.update(1, { username: 'new' });
      expect(repository.update).toHaveBeenCalledWith(1, { username: 'new' });
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(updatedUser);
    });
  });
});
