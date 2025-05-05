import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { ConflictException } from '@nestjs/common';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

describe('UsersService Integration with Testcontainers', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let moduleFixture: TestingModule;
  let pgContainer: StartedPostgreSqlContainer;

  // Increase Jest timeout for container startup
  jest.setTimeout(60000);

  beforeAll(async () => {
    console.info('Starting PostgreSQL container...');
    pgContainer = await new PostgreSqlContainer() // Defaults: postgres:latest, user/pw=test, db=test
      .start();
    console.info('PostgreSQL container started.');

    // Configure TypeORM to connect to the containerized database
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: pgContainer.getHost(),
          port: pgContainer.getPort(),
          username: pgContainer.getUsername(),
          password: pgContainer.getPassword(),
          database: pgContainer.getDatabase(),
          entities: [User],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UsersService],
    }).compile();

    service = moduleFixture.get<UsersService>(UsersService);
    repository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  beforeEach(async () => {
    await repository.clear();
  });

  afterAll(async () => {
    console.info('Closing module...');
    await moduleFixture.close();

    if (pgContainer) {
      console.info('Stopping PostgreSQL container...');
      await pgContainer.stop();
      console.info('PostgreSQL container stopped.');
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('create()', () => {
    it('should successfully create and save a user', async () => {
      const userData: Partial<User> = {
        username: 'testuser_pg',
        password: 'password123',
      };
      const createdUser = await service.create(userData);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.username).toEqual(userData.username);
      expect(createdUser.role).toEqual('user');

      const dbUser = await repository.findOne({
        where: { id: createdUser.id },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.username).toEqual(userData.username);
    });

    it('should throw a ConflictException if username is not unique', async () => {
      const userData: Partial<User> = {
        username: 'unique_user_pg',
        password: 'pw',
      };
      await service.create(userData);
      const duplicateUserData: Partial<User> = {
        username: 'unique_user_pg',
        password: 'pw2',
      };

      // Expect the specific ConflictException thrown by the service
      await expect(service.create(duplicateUserData)).rejects.toThrow(
        ConflictException,
      );

      await expect(service.create(duplicateUserData)).rejects.toThrow(
        `Username '${duplicateUserData.username}' already exists.`,
      );
    });
  });

  describe('findAll()', () => {
    it('should return an empty array when no users exist', async () => {
      const users = await service.findAll();
      expect(users).toEqual([]);
    });

    it('should return all created users', async () => {
      await service.create({ username: 'user1_pg', password: 'pw1' });
      await service.create({ username: 'user2_pg', password: 'pw2' });

      const users = await service.findAll();
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.username)).toEqual(
        expect.arrayContaining(['user1_pg', 'user2_pg']),
      );
    });
  });

  describe('findOne()', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await service.create({
        username: 'findme_pg',
        password: 'pw',
      });
    });

    it('should find a user by id', async () => {
      const foundUser = await service.findOne({ id: testUser.id });
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toEqual(testUser.id);
    });

    it('should find a user by username', async () => {
      const foundUser = await service.findOne({ username: testUser.username });
      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toEqual(testUser.username);
    });

    it('should return null if user not found by id', async () => {
      // Assuming IDs are numeric and 99999 is unlikely to exist quickly
      const foundUser = await service.findOne({ id: 99999 });
      expect(foundUser).toBeNull();
    });

    it('should return null if user not found by username', async () => {
      const foundUser = await service.findOne({ username: 'nonexistent_pg' });
      expect(foundUser).toBeNull();
    });

    it('should throw error if no id or username is provided', async () => {
      await expect(service.findOne({})).rejects.toThrow(
        'Either id or username must be provided',
      );
    });
  });

  describe('update()', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await service.create({
        username: 'update_me_pg',
        password: 'pw',
      });
    });

    it('should update a user username', async () => {
      const newUsername = 'updated_username_pg';
      const updatedUser = await service.update(testUser.id, {
        username: newUsername,
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.username).toEqual(newUsername);

      const dbUser = await repository.findOne({ where: { id: testUser.id } });
      expect(dbUser?.username).toEqual(newUsername);
    });

    it('should update a user role', async () => {
      const newRole = 'admin';
      const updatedUser = await service.update(testUser.id, { role: newRole });

      expect(updatedUser?.role).toEqual(newRole);

      const dbUser = await repository.findOne({ where: { id: testUser.id } });
      expect(dbUser?.role).toEqual(newRole);
    });

    it('should return null if user to update does not exist', async () => {
      const updatedUser = await service.update(99999, { username: 'ghost_pg' });
      expect(updatedUser).toBeNull();
    });
  });

  describe('remove()', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await service.create({
        username: 'delete_me_pg',
        password: 'pw',
      });
    });

    it('should remove a user successfully', async () => {
      let dbUser = await repository.findOne({ where: { id: testUser.id } });
      expect(dbUser).not.toBeNull();

      await service.remove(testUser.id);

      dbUser = await repository.findOne({ where: { id: testUser.id } });
      expect(dbUser).toBeNull();
    });

    it('should not throw an error if removing a non-existent user', async () => {
      await expect(service.remove(99999)).resolves.toBeUndefined();
    });
  });
});
