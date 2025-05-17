import { PartialType, ApiExtraModels } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/**
 * DTO for updating a role.
 * All fields are optional and inherit Swagger metadata from CreateRoleDto.
 */
@ApiExtraModels(CreateRoleDto)
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
