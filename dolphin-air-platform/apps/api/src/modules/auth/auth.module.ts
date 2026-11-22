import { Module } from '@nestjs/common';
import { FirebaseAdminModule } from '../../infrastructure/firebase/firebase-admin.module';
import { DatabaseModule } from '../../database/database.module';
import { AuthController, CustomerAuthController } from './controllers/auth.controller';
import { CustomerAuthGuard } from './guards/customer-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { StaffAuthGuard } from './guards/staff-auth.guard';
import { FirebaseStaffTokenGuard } from './guards/firebase-staff-token.guard';
import { AuthService } from './services/auth.service';
import { DatabaseStaffIdentityService } from './services/database-staff-identity.service';

@Module({
  imports: [FirebaseAdminModule, DatabaseModule],
  controllers: [AuthController, CustomerAuthController],
  providers: [AuthService, DatabaseStaffIdentityService, StaffAuthGuard, FirebaseStaffTokenGuard, CustomerAuthGuard, RolesGuard, PermissionsGuard],
  exports: [AuthService, StaffAuthGuard, CustomerAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
