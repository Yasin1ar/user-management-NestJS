import { IsString, IsOptional, MinLength, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string;

  @IsOptional()
  @IsIn(['user', 'admin'], { message: 'Role must be either "user" or "admin"' })
  role?: 'user' | 'admin';

  @IsOptional()
  refreshToken?: string | null;
}
