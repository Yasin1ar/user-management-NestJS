import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  private deletionTokens = new Map<string, number>();

  async signup(
    username: string,
    password: string,
    role: 'user' | 'admin' = 'user',
  ) {
    try {
      const existing = await this.usersService.findOne({ username: username });
      if (existing) {
        throw new ConflictException('Username already taken');
      }
    } catch {
      const user = await this.usersService.create(username, password, role);
      const tokens = await this.generateTokensByUserId(user.id);
      await this.storeRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    }
  }

  async login(username: string, password: string) {
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
      { sub: user.id, username: user.username, role: user.role },
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

  async generateDeletionToken(userId: number): Promise<string> {
    const token = uuidv4();
    this.deletionTokens.set(token, userId);

    // auto-expire token after 5 minutes
    setTimeout(
      () => {
        this.deletionTokens.delete(token);
      },
      5 * 60 * 1000,
    );

    return token;
  }

  validateDeletionToken(token: string): number | null {
    return this.deletionTokens.get(token) ?? null;
  }

  invalidateDeletionToken(token: string) {
    this.deletionTokens.delete(token);
  }

  async deleteUser(
    userId: number,
    password: string,
    token: string,
    confirmation: string,
  ): Promise<void> {
    if (confirmation !== 'yes') {
      throw new UnauthorizedException('Deletion not confirmed');
    }

    const tokenUserId = this.validateDeletionToken(token);
    if (tokenUserId !== userId) {
      throw new UnauthorizedException('Invalid or expired deletion token');
    }

    const user = await this.usersService.findOne({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (password !== user.password) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.usersService.remove(userId);
    this.invalidateDeletionToken(token);
  }
}
