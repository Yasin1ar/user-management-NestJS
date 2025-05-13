import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from './role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 255, unique: true })
  username: string;

  @Column({ nullable: false, length: 255 })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(() => Role, role => role.users)
  @JoinTable()
  roles: Role[];
  
  @Column({ type: 'text', nullable: true, default: null })
  refreshToken: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
