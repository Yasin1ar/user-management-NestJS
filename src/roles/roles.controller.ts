import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch, 
  Delete, 
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('role_create')
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @Permissions('role_read')
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('role_read')
  async findOne(@Param('id') id: number): Promise<RoleResponseDto> {
    return this.rolesService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('role_update')
  async update(
    @Param('id') id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  @Permissions('role_delete')
  async remove(@Param('id') id: number): Promise<void> {
    return this.rolesService.remove(+id);
  }
}