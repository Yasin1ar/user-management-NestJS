/**
 * User authentication (Sign Up & Login) Data Transfer Object
 *
 * This DTO validates user authentication data with the following rules:
 * - Username is required and must be a string
 * - Password is required and must be a string
 *
 * The class uses class-validator decorators for validation and
 */
import { IsString, MinLength } from 'class-validator';

export class AuthDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}