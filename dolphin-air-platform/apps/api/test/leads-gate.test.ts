import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { LeadsService } from '../src/modules/leads/leads.service';
import { PrismaService } from '../src/database/prisma.service';
import { StaffPrincipal } from '../src/modules/auth/interfaces/authenticated-principal';

const principal: StaffPrincipal = {
  kind: 'staff', uid: 'synthetic', email: 'synthetic@example.invalid', displayName: 'Synthetic Staff',
  role: 'sales', active: true, organizationIds: ['00000000-0000-4000-8000-000000000001'], permissions: [],
};

test('lead operations fail closed while database identity authentication is disabled', async () => {
  const previous = process.env.DATABASE_IDENTITY_AUTH_ENABLED;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.DATABASE_IDENTITY_AUTH_ENABLED = 'false';
  process.env.NODE_ENV = 'development';
  try {
    const database = { get client() { throw new Error('Database must not be queried'); } } as PrismaService;
    const service = new LeadsService(database);
    await assert.rejects(service.list(principal, 25), ServiceUnavailableException);
    await assert.rejects(service.create(principal, {
      fullName: 'Synthetic Lead', countryCode: '+91', phoneNumber: '0000000000', source: 'TEST', service: 'UMRAH',
    }), ServiceUnavailableException);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_IDENTITY_AUTH_ENABLED;
    else process.env.DATABASE_IDENTITY_AUTH_ENABLED = previous;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
