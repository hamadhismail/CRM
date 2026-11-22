import { Type } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';

const customerTypes = ['INDIVIDUAL', 'BUSINESS'] as const;
const customerStatuses = ['ACTIVE', 'INACTIVE'] as const;
const contactMethods = ['PHONE', 'EMAIL', 'WHATSAPP'] as const;

export class CustomerListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) take = 25;
  @IsOptional() @IsUUID('4') cursor?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(customerTypes) type?: typeof customerTypes[number];
  @IsOptional() @IsIn(customerStatuses) status?: typeof customerStatuses[number];
  @IsOptional() @IsIn(['active', 'archived']) state: 'active' | 'archived' = 'active';
  @IsOptional() @IsIn(['createdAt', 'displayName', 'customerNumber']) sort: 'createdAt' | 'displayName' | 'customerNumber' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'desc';
}

export class CreateCustomerDto {
  @IsIn(customerTypes) type!: typeof customerTypes[number];
  @IsString() @MinLength(2) @MaxLength(160) displayName!: string;
  @IsOptional() @IsString() @MaxLength(180) legalName?: string;
  @IsOptional() @Matches(/^\+[1-9]\d{0,3}$/) primaryCountryCode?: string;
  @IsOptional() @Matches(/^\d{6,15}$/) primaryPhone?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(32) preferredLanguage?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsIn(customerStatuses) status?: typeof customerStatuses[number];
  @IsOptional() @IsUUID('4') ownerMembershipId?: string;
  @IsOptional() @IsBoolean() confirmDuplicates?: boolean;
}

export class UpdateCustomerDto {
  @IsOptional() @IsIn(customerTypes) type?: typeof customerTypes[number];
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) displayName?: string;
  @IsOptional() @IsString() @MaxLength(180) legalName?: string;
  @IsOptional() @Matches(/^\+[1-9]\d{0,3}$/) primaryCountryCode?: string | null;
  @IsOptional() @Matches(/^\d{6,15}$/) primaryPhone?: string | null;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string | null;
  @IsOptional() @IsString() @MaxLength(32) preferredLanguage?: string | null;
  @IsOptional() @IsString() @MaxLength(80) country?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsIn(customerStatuses) status?: typeof customerStatuses[number];
  @IsOptional() @IsUUID('4') ownerMembershipId?: string;
  @IsOptional() @IsBoolean() confirmDuplicates?: boolean;
}

export class CustomerDuplicateCheckDto {
  @IsOptional() @Matches(/^\+[1-9]\d{0,3}$/) countryCode?: string;
  @IsOptional() @Matches(/^\d{6,15}$/) phoneNumber?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(180) businessName?: string;
  @IsOptional() @IsUUID('4') excludeCustomerId?: string;
}

export class CustomerContactDto {
  @IsString() @MinLength(2) @MaxLength(160) fullName!: string;
  @IsOptional() @IsString() @MaxLength(120) designation?: string;
  @IsOptional() @Matches(/^\+[1-9]\d{0,3}$/) countryCode?: string;
  @IsOptional() @Matches(/^\d{6,15}$/) phoneNumber?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsIn(contactMethods) preferredMethod?: typeof contactMethods[number];
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class CustomerLeadConversionDto {
  @IsIn(['CREATE', 'LINK']) mode!: 'CREATE' | 'LINK';
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsBoolean() allowDuplicate?: boolean;
  @Matches(/^[A-Za-z0-9._:-]{16,128}$/) idempotencyKey!: string;
}
