import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Role } from './role.entity';
import {
  CreateUserDto,
  UserResponseDto,
  UpdateUserDto,
  PaginatedUsersResponse,
} from '../dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    this.logger = new Logger(UsersService.name);
  }

  private readonly logger: Logger;

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private toUserResponseDto(user: User): UserResponseDto {
    const { password, refreshToken, ...userResponse } = user;
    return userResponse;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, roleIds } = createUserDto;

    // Check if user already exists (case-insensitive)
    const existingUser = await this.findUserByUsernameOptional(username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    try {
      const hashedPassword = await this.hashPassword(password);
      const newUser = this.userRepository.create({
        username: username.toLowerCase(),
        password: hashedPassword,
      });

      // Assign roles if roleIds are provided
      if (roleIds && roleIds.length > 0) {
        const roles = await this.roleRepository.findByIds(roleIds);
        newUser.roles = roles;
      }

      return await this.userRepository.save(newUser);
    } catch (error) {
      this.logger.error(error);

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: { role?: 'user' | 'admin'; search?: string },
  ): Promise<PaginatedUsersResponse> {
    try {
      const skip = (page - 1) * limit;
      const query = this.userRepository.createQueryBuilder('user');

      if (filters?.role) {
        query.andWhere('user.role = :role', { role: filters.role });
      }

      if (filters?.search) {
        query.andWhere('user.username LIKE :search', {
          search: `%${filters.search}%`,
        });
      }

      const [users, total] = await query
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        total,
        page,
        limit,
        data: users.map((user) => this.toUserResponseDto(user)),
      };
    } catch (error) {
      this.logger.error(error);

      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  // This method throws an exception when user is not found (use for retrieval)
  async findOneByUsername(username: string): Promise<User> {
    const user = await this.findUserByUsernameOptional(username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  // This method doesn't throw an exception when user is not found (use for existence checks)
  async findUserByUsernameOptional(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username: username.toLowerCase() },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    try {
      // Check if username is being updated and if it's available (case-insensitive)
      if (
        updateUserDto.username &&
        updateUserDto.username.toLowerCase() !== user.username
      ) {
        const existingUser = await this.findUserByUsernameOptional(
          updateUserDto.username,
        );
        if (existingUser) {
          throw new ConflictException('Username already exists');
        }
        user.username = updateUserDto.username.toLowerCase();
      }

      if (updateUserDto.password) {
        user.password = await this.hashPassword(updateUserDto.password);
      }

      // Handle refresh token update
      if (updateUserDto.refreshToken !== undefined) {
        this.logger.log(`Updating refresh token for user ${id}`);
        user.refreshToken = updateUserDto.refreshToken;
      }

      // Save the updated user
      const updatedUser = await this.userRepository.save(user);

      // Verify the update
      const verifiedUser = await this.userRepository.findOne({ where: { id } });
      if (!verifiedUser) {
        throw new Error('Failed to verify user update');
      }

      return verifiedUser;
    } catch (error) {
      this.logger.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
