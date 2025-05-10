import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Expose()
  role: 'user' | 'admin';

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt?: Date;
}
