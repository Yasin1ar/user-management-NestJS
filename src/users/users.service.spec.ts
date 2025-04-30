
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';

// Simple mock repository
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find all users', async () => {
    const mockUsers = [{ id: 1, username: 'test', password: 'pass', role: 'user' as const }];
    repository.find.mockResolvedValue(mockUsers);
    
    expect(await service.findAll()).toEqual(mockUsers);
    expect(repository.find).toHaveBeenCalled();
  });

  it('should find one user by id', async () => {
    const mockUser = { id: 1, username: 'test', password: 'pass', role: 'user' as const };
    repository.findOne.mockResolvedValue(mockUser);
    
    expect(await service.findOne(1)).toEqual(mockUser);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should create a user', async () => {
    const userData = { username: 'new', password: 'pass', role: 'user' as const };
    const savedUser = { id: 1, ...userData };
    repository.save.mockResolvedValue(savedUser);
    
    expect(await service.create(userData)).toEqual(savedUser);
    expect(repository.save).toHaveBeenCalledWith(userData);
  });

  it('should update a user', async () => {
    const userData = { username: 'updated' };
    const updatedUser = { id: 1, username: 'updated', password: 'pass', role: 'user' as const };
    repository.update.mockResolvedValue({ affected: 1 });
    repository.findOne.mockResolvedValue(updatedUser);
    
    expect(await service.update(1, userData)).toEqual(updatedUser);
    expect(repository.update).toHaveBeenCalledWith(1, userData);
  });

  it('should remove a user', async () => {
    await service.remove(1);
    expect(repository.delete).toHaveBeenCalledWith(1);
  });
});
