import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsIn,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Transform(({ value }) => value?.toLowerCase())
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
  
  @IsOptional()
  @IsArray()
  roleIds?: number[]; // For assigning roles during user creation

  @IsOptional()
  refreshToken?: string | null;
}
