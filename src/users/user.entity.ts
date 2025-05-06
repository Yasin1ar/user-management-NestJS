import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 255, unique: true })
  username: string;

  @Column({ nullable: false, length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    default: 'user'
  })
  role: 'user' | 'admin';

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;
}