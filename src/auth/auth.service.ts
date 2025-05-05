import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Body,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuthDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(@Body() signUpDto: AuthDto) {
    const existing = await this.usersService.findOne({
      username: signUpDto.username,
    });
    if (existing) {
      throw new ConflictException('Username already taken');
    }
    const user = await this.usersService.create(signUpDto);
    const tokens = await this.generateTokensByUserId(user.id);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async login(@Body() loginDto: AuthDto) {
    const { username, password } = loginDto;

    const user = await this.usersService.findOne({ username });
    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokensByUserId(user.id);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async generateTokensByUserId(userId: number) {
    const user = await this.usersService.findOne({ id: userId });
    if (!user) throw new UnauthorizedException('User not found');

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, username: user.username, role: user.role },
      { expiresIn: '15m' },
    );

    const refreshToken = await this.jwtService.signAsync(
      {sub: user.id, username: user.username, role: user.role },
      { expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(userId: number, refreshToken: string) {
    await this.usersService.update(userId, { refreshToken });
  }

  async verifyRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.usersService.findOne({ id: userId });
    if (!user?.refreshToken) return false;
    return user.refreshToken === refreshToken;
  }

  async updateRefreshToken(userId: number, newRefreshToken: string) {
    await this.usersService.update(userId, { refreshToken: newRefreshToken });
  }

  async removeRefreshToken(userId: number) {
    await this.usersService.update(userId, { refreshToken: null });
  }
}
