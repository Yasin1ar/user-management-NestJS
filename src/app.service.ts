import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  welcome(): string {
    return `Welcome to User Management Project! head to /auth for authentication related actions,
    or if you are a authorized user you can check the Users CRUD functionalities at /users`;
  }
}
