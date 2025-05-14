import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../users/permission.entity';

export class RoleResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the role',
  })
  id: number;

  @ApiProperty({
    example: 'admin',
    description: 'Name of the role',
  })
  name: string;

  @ApiProperty({
    example: 'Administrator role with full access',
    description: 'Description of the role and its privileges',
  })
  description: string;

  @ApiProperty({
    type: [Permission],
    description: 'List of permissions associated with this role',
  })
  permissions: Permission[];
}
