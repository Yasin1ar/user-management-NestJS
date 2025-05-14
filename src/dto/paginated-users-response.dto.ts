import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../dto';

export class PaginatedUsersResponse {
  @ApiProperty({
    type: [UserResponseDto],
    description: 'Array of user objects',
  })
  data: UserResponseDto[];

  @ApiProperty({
    example: 100,
    description: 'Total number of users matching the query',
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
  })
  limit: number;
}
