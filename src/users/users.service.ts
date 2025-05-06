import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(options: { id?: number; username?: string }) {
    const { id, username } = options;
    if (!id && !username) {
      throw new BadRequestException('Either id or username must be provided');
    }
    const user = await this.usersRepository.findOne({
      where: id ? { id } : { username },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async create(
    username: string,
    password: string,
    role: 'user' | 'admin' = 'user',
  ): Promise<User> {
    const checkDuplicate = await this.usersRepository.findOne({
      where: { username },
    });
    if (checkDuplicate) {
      throw new ConflictException(`Username '${username}' already exists.`);
    }
    const newUser = this.usersRepository.create({ username, password, role });
    return this.usersRepository.save(newUser);
  }

  async update(id: number, userData: Partial<User>) {
    await this.usersRepository.update(id, userData);
    return this.findOne({ id });
  }
}
