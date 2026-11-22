import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'node:crypto';
import { FirebaseAdminService } from '../../../infrastructure/firebase/firebase-admin.service';
import { CustomerPrincipal } from '../interfaces/authenticated-principal';
import { extractBearerToken } from './staff-auth.guard';

export interface CustomerAuthenticatedRequest extends Request {
  customer?: CustomerPrincipal;
  customerSessionToken?: string;
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly firebase: FirebaseAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomerAuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token?.startsWith('csess_')) throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Customer session required.' });

    try {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const snapshot = await this.firebase.firestore.collection('customer_sessions').doc(tokenHash).get();
      const session = snapshot.data();
      const expiresAt = session ? timestampMillis(session.expiresAt) : null;
      if (!snapshot.exists || !session || session.revoked === true || expiresAt === null || expiresAt <= Date.now()) {
        throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Customer session required.' });
      }
      const phone = String(session.phone ?? session.customerPhone ?? '');
      const customerId = String(session.customerId ?? '');
      if (!phone || !customerId) {
        throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Customer session required.' });
      }
      request.customer = {
        kind: 'customer',
        customerId,
        phone,
        name: String(session.name ?? session.customerName ?? 'Customer'),
        email: String(session.email ?? session.customerEmail ?? ''),
      };
      request.customerSessionToken = token;
      return true;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Customer session required.' });
    }
  }
}

function timestampMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    const milliseconds = value.toMillis();
    return typeof milliseconds === 'number' && Number.isFinite(milliseconds) ? milliseconds : null;
  }
  return null;
}
