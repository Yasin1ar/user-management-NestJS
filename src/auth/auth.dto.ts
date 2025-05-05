/**
 * User authentication (Sign Up & Login) Data Transfer Object
 *
 * This DTO validates user authentication data with the following rules:
 * - Username is required, must not be empty, and must be a string
 * - Password is required, must not be empty, and must be a string
 * - Role must be either 'user' or 'admin', defaults to 'user'
 *
 * The class uses class-validator decorators for validation
 */
import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';



export class AuthDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  role: 'user' | 'admin' = 'user';
}
