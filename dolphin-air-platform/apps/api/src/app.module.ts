import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DatabaseModule } from './database/database.module';
import { LeadsModule } from './modules/leads/leads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')] }),
    AuthModule, UsersModule, RolesModule, PermissionsModule, OrganizationsModule, DatabaseModule, LeadsModule,
  ],
})
export class AppModule {}
