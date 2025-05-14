import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity()
export class User {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Username (unique)',
    example: 'johndoe',
  })
  @Column({ unique: true })
  username: string;

  @Column({ type: 'varchar' })
  password: string;

  @ApiProperty({
    description: 'JWT refresh token for the user',
    nullable: true,
    type: String,
  })
  @Column({ nullable: true, type: 'text' })
  refreshToken: string | null;

  @ApiProperty({
    description: 'Date and time when the user was created',
    example: '2023-01-01T12:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time when the user was last updated',
    example: '2023-01-01T12:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    description: 'User assigned roles',
    type: [Role],
  })
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable()
  roles: Role[];
}
