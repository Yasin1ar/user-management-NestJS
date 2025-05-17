import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password of the user',
    example: 'CurrentPass123!',
    minLength: 8,
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password for the user. Must be at least 8 characters.',
    example: 'NewStrongPass456!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
