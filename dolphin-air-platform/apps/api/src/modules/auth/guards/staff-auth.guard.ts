import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { StaffPrincipal } from '../interfaces/authenticated-principal';

export interface StaffAuthenticatedRequest extends Request {
  user?: StaffPrincipal;
}

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StaffAuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    try {
      const organizationHeader = request.headers['x-organization-id'];
      const organizationId = typeof organizationHeader === 'string' ? organizationHeader : undefined;
      request.user = await this.authService.authenticateStaff(token, organizationId);
      return true;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
  }
}

export function extractBearerToken(request: Request): string | null {
  const primary = request.headers.authorization;
  const fallback = request.headers['x-authorization'];
  const raw = typeof primary === 'string' ? primary : typeof fallback === 'string' ? fallback : '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(raw.trim());
  return match?.[1] ?? null;
}
