import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { App } from 'supertest/types'; // Import App type if needed, adjust based on supertest version

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let httpServer: App; // Use App type or any for httpServer if App type causes issues
  let authToken: string;

  beforeAll(async () => { // Use beforeAll for setup that doesn't need repeating
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply pipes globally, similar to main.ts if needed for validation etc.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    httpServer = app.getHttpServer(); // Get the underlying HTTP server
  });

  afterAll(async () => {
    await app.close(); // Close the NestJS application
  });

  it('/ (GET)', () => {
    // Basic test to check if the app root is reachable (if you have one)
    // Replace with an actual endpoint if '/' is not defined
    // return request(httpServer)
    //   .get('/')
    //   .expect(200)
    //   .expect('Hello World!'); // Adjust expected response based on your AppController
    // For now, let's skip this if you don't have a GET / route
    expect(true).toBe(true); // Placeholder
  });

  describe('/auth', () => {
    const testUser = {
      username: `testuser_${Date.now()}`, // Ensure unique username for each run
      password: 'password123',
    };

    it('/auth/signup (POST) - should create a new user and return user info with token', async () => {
      return request(httpServer)
        .post('/auth/signup')
        .send(testUser)
        .expect(201) // Expect HTTP status 201 Created
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username', testUser.username);
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).not.toHaveProperty('password'); // Ensure password is not returned
        });
    });

    it('/auth/signup (POST) - should fail if username already exists', async () => {
      // First signup is expected to succeed (or use a pre-existing user if necessary)
      await request(httpServer).post('/auth/signup').send(testUser);

      // Second attempt with the same username
      return request(httpServer)
        .post('/auth/signup')
        .send(testUser)
        .expect(409); // Expect HTTP status 409 Conflict (or adjust based on your error handling)
    });

    it('/auth/login (POST) - should log in the user and return an access token', async () => {
      // Ensure the user exists first (could rely on the signup test above or create one here)
      await request(httpServer).post('/auth/signup').send(testUser).expect(201); // Or handle potential conflict

      return request(httpServer)
        .post('/auth/login')
        .send(testUser)
        .expect(200) // Expect HTTP status 200 OK
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          authToken = res.body.access_token; // Store the token for protected routes
        });
    });

    it('/auth/login (POST) - should fail with incorrect password', async () => {
      return request(httpServer)
        .post('/auth/login')
        .send({ username: testUser.username, password: 'wrongpassword' })
        .expect(401); // Expect HTTP status 401 Unauthorized
    });

    it('/auth/profile (GET) - should return user profile if authenticated', async () => {
      // Ensure login succeeded and authToken is set
      expect(authToken).toBeDefined();

      return request(httpServer)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`) // Set the Authorization header
        .expect(200) // Expect HTTP status 200 OK
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username', testUser.username);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('/auth/profile (GET) - should fail if not authenticated', async () => {
      return request(httpServer)
        .get('/auth/profile')
        .expect(401); // Expect HTTP status 401 Unauthorized
    });
  });

  // Add describe blocks for other controllers like /users here
  // describe('/users', () => {
  //   // Add tests for GET /users, POST /users, GET /users/:id etc.
  //   // Remember to use the authToken for protected user routes
  // });
});
