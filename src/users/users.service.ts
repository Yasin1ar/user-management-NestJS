import { Injectable, ConflictException } from '@nestjs/common';
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
      throw new Error('Either id or username must be provided');
    }
    return this.usersRepository.findOne({
      where: id ? { id } : { username },
    });
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async create(user: Partial<User>): Promise<User> {
    const { username } = user;
    const checkDuplicate = await this.usersRepository.findOne({
      where: { username },
    });
    if (checkDuplicate) {
      throw new ConflictException(`Username '${username}' already exists.`);
    }
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }

  async update(id: number, userData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, userData);
    return this.findOne({ id });
  }
}
