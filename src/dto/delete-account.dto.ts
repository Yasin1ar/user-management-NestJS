import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({
    description:
      'Password of the user for deletion confirmation (at least 8 characters).',
    example: 'UserPassToDelete!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Confirmation keyword; must be exactly "DELETE".',
    example: 'DELETE',
    pattern: '^DELETE$',
  })
  @IsString()
  @Matches(/^DELETE$/, { message: 'Confirmation must be exactly "DELETE"' })
  confirmation: string;
}
