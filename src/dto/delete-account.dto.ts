import { IsString, MinLength, Matches } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Matches(/^DELETE$/, { message: 'Confirmation must be exactly "DELETE"' })
  confirmation: string;
}
