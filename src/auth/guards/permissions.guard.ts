import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { DataSource } from 'typeorm';
import { User } from '../../users/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource, // Inject DataSource
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // No permissions required = public route
    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub; // From JWT

    if (!userId) return false;

    // Fresh DB query for roles/permissions
    const userWithPermissions = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!userWithPermissions?.roles) return false;

    // Flatten permissions
    const userPermissions = userWithPermissions.roles.flatMap(role => 
      role.permissions.map(p => p.name)
    );

    return requiredPermissions.some(p => userPermissions.includes(p));
  }
}