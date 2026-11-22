import { IsEmail, IsOptional, IsUUID, Matches, MaxLength } from 'class-validator';

export class AssignLeadDto {
  @IsUUID('4') membershipId!: string;
}

export class LeadDuplicateCheckDto {
  @IsOptional() @Matches(/^\+[1-9]\d{0,3}$/) countryCode?: string;
  @IsOptional() @Matches(/^\d{6,15}$/) phoneNumber?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsUUID('4') excludeLeadId?: string;
}

