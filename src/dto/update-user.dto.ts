import { IsString, IsOptional, MinLength, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Optional new username (at least 3 characters)',
    example: 'newusername2024',
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username?: string;

  @ApiPropertyOptional({
    description: 'Optional new password (at least 8 characters)',
    example: 'AnotherStrongPassword!',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Optional array of new role IDs for the user',
    example: [2, 3],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  roleIds?: number[]; // For updating user roles

  @ApiPropertyOptional({
    description: 'Optional refresh token; nullable',
    example: null,
    nullable: true,
  })
  @IsOptional()
  refreshToken?: string | null;
}
