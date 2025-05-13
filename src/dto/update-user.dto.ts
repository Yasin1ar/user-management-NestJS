import { IsString, IsOptional, MinLength, IsIn, IsArray } from 'class-validator';

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
  @IsArray()
  roleIds?: number[]; // For updating user roles

  @IsOptional()
  refreshToken?: string | null;
}
