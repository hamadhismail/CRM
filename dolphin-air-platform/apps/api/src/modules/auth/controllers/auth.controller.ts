import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FirebaseAdminService } from '../../../infrastructure/firebase/firebase-admin.service';
import { CustomerAuthGuard, CustomerAuthenticatedRequest } from '../guards/customer-auth.guard';
import { FirebaseStaffTokenGuard, FirebaseStaffTokenRequest } from '../guards/firebase-staff-token.guard';
import { StaffAuthGuard, StaffAuthenticatedRequest } from '../guards/staff-auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(StaffAuthGuard)
  me(@Req() request: StaffAuthenticatedRequest) {
    return this.authService.me(request.user!);
  }

  @Get('organizations')
  @UseGuards(FirebaseStaffTokenGuard)
  organizations(@Req() request: FirebaseStaffTokenRequest) {
    return this.authService.listStaffOrganizations(request.verifiedFirebaseIdentity!);
  }

  @Post('logout')
  @UseGuards(FirebaseStaffTokenGuard)
  async logout(@Req() request: FirebaseStaffTokenRequest) {
    await this.authService.logoutStaffUid(request.verifiedFirebaseIdentity!.uid);
    return { success: true };
  }
}

@Controller('api/customer/auth')
export class CustomerAuthController {
  constructor(private readonly firebase: FirebaseAdminService) {}

  @Get('session')
  @UseGuards(CustomerAuthGuard)
  session(@Req() request: CustomerAuthenticatedRequest) {
    return { customer: request.customer };
  }

  @Post('logout')
  @UseGuards(CustomerAuthGuard)
  async logout(@Req() request: CustomerAuthenticatedRequest) {
    if (request.customerSessionToken) {
      const tokenHash = createHash('sha256').update(request.customerSessionToken).digest('hex');
      await this.firebase.firestore.collection('customer_sessions').doc(tokenHash).delete();
    }
    return { success: true };
  }
}
