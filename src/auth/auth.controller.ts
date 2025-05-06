import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Headers,
  Res,
  Request,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  async signup(@Body() signUpDto: AuthDto) {
    const username = signUpDto.username.toLowerCase();
    try {
      const tokens = await this.authService.signup(
        username,
        signUpDto.password,
        signUpDto.role,
      );
      return tokens; // { accessToken, refreshToken }
    } catch (e) {
      // Show error for test debugging
      throw new BadRequestException(e.message || 'Signup failed');
    }
  }
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Res({ passthrough: true }) res, @Body() loginDto: AuthDto) {
    const username = loginDto.username.toLowerCase();
    try {
      const { accessToken, refreshToken } = await this.authService.login(
        username,
        loginDto.password,
      );
      return { accessToken, refreshToken };
    } catch (e) {
      throw new BadRequestException(e.message || 'Login failed');
    }
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const id = req.user.sub;
    const user = await this.userService.findOne({ id });
    const { refreshToken, ...restOfUser } = user;
    return restOfUser;
  }

  @Post('refresh')
  async refresh(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const refreshToken = authHeader.split(' ')[1];

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;
    const isValid = await this.authService.verifyRefreshToken(
      userId,
      refreshToken,
    );

    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.authService.generateTokensByUserId(userId);
    await this.authService.updateRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  // Step 1: Generate deletion token
  @UseGuards(AuthGuard)
  @Post('delete-request')
  async requestDeletion(@Request() req) {
    const userId = req.user.sub;
    const token = await this.authService.generateDeletionToken(userId);
    return {
      message:
        'Are you sure you want to delete your account? Send DELETE /delete with confirmation, password, and this token.',
      deletionToken: token,
    };
  }

  // Step 2: Confirm deletion
  @UseGuards(AuthGuard)
  @Delete('delete')
  async confirmDeletion(
    @Request() req,
    @Body()
    body: { confirmation: string; password: string; deletionToken: string },
  ) {
    const userId = req.user.sub;
    const { confirmation, password, deletionToken } = body;

    await this.authService.deleteUser(
      userId,
      password,
      deletionToken,
      confirmation,
    );

    return { message: 'User deleted successfully' };
  }
  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePass(@Request() req, @Body() passwords:{password:string, new_password:string}) {
    const id = req.user.sub;
    const {password, new_password} = passwords;
    const changedPass = await this.authService.changePassword(id, password, new_password);
    return {message:"successfully changed", password:changedPass.password};
  }
}
