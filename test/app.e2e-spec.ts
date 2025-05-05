import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';
import { AuthDto } from '../src/auth/auth.dto';

describe('Application (e2e)', () => {
  let app: INestApplication;
  let pgContainer: StartedPostgreSqlContainer;
  let accessToken: string;
  let refreshToken: string;
  let userId: number;

  // Increase timeout for container startup
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Start PostgreSQL container
    pgContainer = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    // Create testing module with the containerized database
    const moduleFixture: TestingModule = await Test.createTestingModule({
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
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (pgContainer) {
      await pgContainer.stop();
    }
  });

  describe('Auth', () => {
    const signupDto: AuthDto = {
      username: 'testuser',
      password: 'Testpass123!',
      role: 'user',
    };

    const loginDto: AuthDto = {
      username: 'testuser',
      password: 'Testpass123!',
      role: 'user',
    };

    it('should sign up a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should login with the new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sub');
      expect(response.body).toHaveProperty('username', signupDto.username);

      userId = response.body.id;
    });

    it('should refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });
  });

  describe('Users', () => {
    it('should create a new user (admin required)', async () => {
      // First create an admin user to test admin-only routes
      const adminSignupDto: AuthDto = {
        username: 'adminuser',
        password: 'Adminpass123!',
        role: 'admin',
      };

      const adminLoginResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(adminSignupDto)
        .expect(201);

      const adminAccessToken = adminLoginResponse.body.accessToken;

      const newUserDto = {
        username: 'newuser',
        password: 'Newpass123!',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toEqual(newUserDto.username);
    });

    it('should get all users (admin required)', async () => {
      // Login as admin
      const adminLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'adminuser',
          password: 'Adminpass123!',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminLoginResponse.body.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get a specific user (admin required)', async () => {
      // Login as admin
      const adminLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'adminuser',
          password: 'Adminpass123!',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminLoginResponse.body.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('username', 'testuser');
    });
  });

  describe('Error cases', () => {
    it('should fail to sign up with duplicate username', async () => {
      const duplicateUser: AuthDto = {
        username: 'testuser',
        password: 'Anotherpass123!',
        role: 'user',
      };

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(duplicateUser)
        .expect(400);
    });

    it('should fail to login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(400);
    });

    it('should fail to access protected route without token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail to access admin route as regular user', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });
});
