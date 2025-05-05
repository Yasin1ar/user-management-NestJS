import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  username: string;

  @Column({ nullable: false })
  password: string;

  @Column({
    type: 'varchar',
    default: 'user',
    nullable: false,
    enum: ['user', 'admin'],
  })
  role: 'user' | 'admin';
  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;
}
