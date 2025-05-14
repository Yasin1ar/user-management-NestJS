import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpStatus } from '@nestjs/common';
import { CreateUserDto, LoginUserDto, TokensResponseDto } from '../src/dto';

/**
 * @description This is a comprehensive End-to-End (E2E) test suite for the authentication
 * and basic application endpoints of the NestJS User Management Project. It sets up
 * the entire application context and tests various API endpoints to ensure they
 * function as expected.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  const newUser: CreateUserDto = {
    username: 'e2etestuser',
    password: 'e2etestpassword',
    roleIds: [1], // Role ID for basic user role
  };
  const loginUser: LoginUserDto = {
    username: newUser.username,
    password: newUser.password,
  };

  /**
   * @beforeAll Sets up the NestJS application before running any tests.
   * It compiles the AppModule and creates an instance of the application.
   */
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  /**
   * @afterAll Closes the NestJS application after all tests have completed.
   * This ensures that resources are properly released.
   */
  afterAll(async () => {
    await app.close();
  });

  /**
   * @describe Test suite for the root endpoint of the application.
   */
  describe('/ (GET)', () => {
    /**
     * @test Should return the welcome message from the AppService.
     * This test verifies that the root endpoint is accessible and returns the
     * expected string.
     */
    it('should return "Welcome to User Management Project! head to /auth for authentication related actions, \
     or if you are a authorized user you can check the Users CRUD functionalities at /users"', () => {
      return request(app.getHttpServer()).get('/').expect(200).expect(
        'Welcome to User Management Project! head to /auth for authentication related actions, \
     or if you are a authorized user you can check the Users CRUD functionalities at /users',
      );
    });
  });

  /**
   * @describe Test suite for the authentication endpoints (/auth).
   */
  describe('/auth (POST)', () => {
    /**
     * @test Should register a new user successfully.
     * This test sends a POST request to the /auth/register endpoint with user details
     * and expects a 201 Created status code and a response containing access and
     * refresh tokens.
     */
    it('/register should return tokens on successful registration', async () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(HttpStatus.CREATED)
        .then((response) => {
          const tokens: TokensResponseDto = response.body;
          expect(tokens).toHaveProperty('accessToken');
          expect(tokens).toHaveProperty('refreshToken');
          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;
        });
    });

    /**
     * @test Should fail registration if the username already exists.
     * This test attempts to register the same user again and expects a 409 Conflict
     * status code, indicating that the username is already taken.
     */
    it('/register should return Conflict if username already exists', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(HttpStatus.CONFLICT);
    });

    /**
     * @test Should login an existing user successfully.
     * This test sends a POST request to the /auth/login endpoint with the registered
     * user's credentials and expects a 200 OK status code and a response containing
     * new access and refresh tokens.
     */
    it('/login should return tokens on successful login', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginUser)
        .expect(HttpStatus.OK)
        .then((response) => {
          const tokens: TokensResponseDto = response.body;
          expect(tokens).toHaveProperty('accessToken');
          expect(tokens).toHaveProperty('refreshToken');
          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;
        });
    });

    /**
     * @test Should fail login with unauthorized status if credentials are incorrect.
     * This test attempts to log in with incorrect password and expects a 401
     * Unauthorized status code.
     */
    it('/login should return Unauthorized if credentials are wrong', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: loginUser.username, password: 'wrongpassword' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    /**
     * @test Should refresh the access token using a valid refresh token.
     * This test sends a POST request to the /auth/refresh endpoint with a valid
     * refresh token in the Authorization header and expects a 200 OK status code
     * and a response containing a new access token.
     */
    it('/refresh should return a new access token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).not.toHaveProperty('refreshToken'); // Typically, refresh doesn't return a new refresh token
          accessToken = response.body.accessToken; // Update access token for subsequent requests
        });
    });

    /**
     * @test Should fail to refresh the access token with an invalid refresh token.
     * This test sends a POST request to the /auth/refresh endpoint with an invalid
     * refresh token and expects a 401 Unauthorized status code.
     */
    it('/refresh should return Unauthorized for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid_refresh_token')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  /**
   * @describe Test suite for the protected profile endpoint (/auth/profile).
   */
  describe('/auth/profile (GET)', () => {
    /**
     * @test Should return the user profile when a valid access token is provided.
     * This test sends a GET request to the /auth/profile endpoint with a valid
     * access token in the Authorization header and expects a 200 OK status code
     * and a response containing the user's profile information (excluding sensitive
     * data like password and refreshToken).
     */
    it('should return user profile with a valid access token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('username', newUser.username);
          expect(response.body).toHaveProperty('roles'); // Check for roles array
          expect(response.body.roles.length).toBeGreaterThan(0); // Should have at least one role
          expect(response.body.roles[0]).toHaveProperty('name'); // Role should have a name
          expect(response.body).not.toHaveProperty('password');
          expect(response.body).not.toHaveProperty('refreshToken');
        });
    });

    /**
     * @test Should return Unauthorized if no or invalid access token is provided.
     * This test sends a GET request to the /auth/profile endpoint without a valid
     * access token and expects a 401 Unauthorized status code, as this endpoint
     * is protected by the AuthGuard.
     */
    it('should return Unauthorized without a valid access token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  /**
   * @describe Additional test suite for user CRUD operations (if accessible with user token).
   * Note: These tests might fail if the user doesn't have appropriate permissions.
   */
  describe('/users (with authenticated user)', () => {
    /**
     * @test Should get the list of users if the token has appropriate permissions.
     * This test attempts to access the /users endpoint with the user's access token.
     * The test passes if we get a 200 OK (user has permissions) or 403 Forbidden
     * (user doesn't have permissions), as both are valid responses depending on the
     * role configuration.
     */
    it('should access /users endpoint with valid permissions', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .then((response) => {
          // Either 200 (with permission) or 403 (without permission) is acceptable
          expect([HttpStatus.OK, HttpStatus.FORBIDDEN]).toContain(
            response.status,
          );

          if (response.status === HttpStatus.OK) {
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
          }
        });
    });

    /**
     * @test Should return Unauthorized if attempting to access /users without a token.
     * This test verifies that the /users endpoint is protected and requires
     * authentication.
     */
    it('should return Unauthorized when accessing /users without a token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
