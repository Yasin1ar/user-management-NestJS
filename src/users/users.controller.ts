import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import {
  CreateUserDto,
  PaginatedUsersResponse,
  UpdateUserDto,
  UserResponseDto,
} from '../dto';
import {Permissions} from '../auth/decorators/permissions.decorator';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('user_create')
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return this.toUserResponseDto(user);
  }
  
  @Get()
  @Permissions('user_read')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedUsersResponse> {
    return this.usersService.findAll(page, limit);
  }
  
  @Get(':id')
  @Permissions('user_read')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toUserResponseDto(user);
  }
  
  @Delete(':id')
  @Permissions('user_delete')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    try {
      await this.usersService.remove(id);
    } catch (error) {
      throw error;
    }
  }
  
  @Patch(':id')
  @Permissions('user_update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto);
    return this.toUserResponseDto(user);
  }

  private toUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    };
  }
}
