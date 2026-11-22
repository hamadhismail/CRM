import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { AuthService } from '../services/auth.service';
import { extractBearerToken } from './staff-auth.guard';

export interface FirebaseStaffTokenRequest extends Request {
  verifiedFirebaseIdentity?: DecodedIdToken;
}

@Injectable()
export class FirebaseStaffTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FirebaseStaffTokenRequest>();
    const token = extractBearerToken(request);
    if (!token) throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    try {
      request.verifiedFirebaseIdentity = await this.authService.verifyStaffIdentityToken(token);
      return true;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
  }
}
