import { RoleResponseDto } from '@/roles/dto';
import { Expose, Type } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt?: Date;

  @Expose()
  @Type(() => RoleResponseDto)
  roles?: RoleResponseDto[]; // Include roles in response
}
