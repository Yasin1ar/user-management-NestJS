import { DataSource } from 'typeorm';
import { Permission } from './../users/permission.entity';
import { Role } from '../users/role.entity';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcrypt';
export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async seed() {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedAdminUser();
  }

  private async seedPermissions() {
    const permissionRepository = this.dataSource.getRepository(Permission);

    const permissions = [
      { name: 'user_create', description: 'Create users' },
      { name: 'user_read', description: 'Read users' },
      { name: 'user_update', description: 'Update users' },
      { name: 'user_delete', description: 'Delete users' },
      { name: 'role_create', description: 'Create roles' },
      { name: 'role_read', description: 'Read roles' },
      { name: 'role_update', description: 'Update roles' },
      { name: 'role_delete', description: 'Delete roles' },
      // Add more permissions as needed
    ];

    for (const permissionData of permissions) {
      const permissionExists = await permissionRepository.findOneBy({
        name: permissionData.name,
      });
      if (!permissionExists) {
        const permission = permissionRepository.create(permissionData);
        await permissionRepository.save(permission);
      }
    }
  }

  private async seedRoles() {
    const roleRepository = this.dataSource.getRepository(Role);
    const permissionRepository = this.dataSource.getRepository(Permission);

    const adminPermissions = await permissionRepository.find();

    const adminRole = await roleRepository.findOneBy({ name: 'admin' });
    if (!adminRole) {
      const newAdminRole = roleRepository.create({
        name: 'admin',
        description: 'Administrator with full access',
        permissions: adminPermissions,
      });
      await roleRepository.save(newAdminRole);
    }

    // Add other default roles if needed
  }

  private async seedAdminUser() {
    const userRepository = this.dataSource.getRepository(User);
    const roleRepository = this.dataSource.getRepository(Role);

    const adminRole = await roleRepository.findOneBy({ name: 'admin' });
    const adminUser = await userRepository.findOneBy({ username: 'admin' });

    if (!adminUser && adminRole) {
      const newAdmin = userRepository.create({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10), // In production, use a more complex password
        roles: [adminRole],
      });
      await userRepository.save(newAdmin);
    }
  }
}
