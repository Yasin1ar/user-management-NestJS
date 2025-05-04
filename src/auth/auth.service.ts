import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async logIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne({ username });
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.id, username: user.username, role: user.role };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  async signUp(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const newUser = await this.usersService.create({
      username: username,
      password: pass,
    });
    const payload = {
      sub: newUser.id,
      username: newUser.username,
      role: newUser.role,
    };
    const { password, ...userWithoutPassword } = newUser;
    return {
      ...userWithoutPassword,
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
