import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const services = ['UMRAH', 'HAJJ', 'ZIYARATH', 'FLIGHT_TICKETS', 'HOTELS', 'VISA_ASSISTANCE', 'HOLIDAY_PACKAGES', 'OTHER_TRAVEL'] as const;

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(160)
  fullName!: string;

  @Matches(/^\+[1-9]\d{0,3}$/)
  countryCode!: string;

  @Matches(/^\d{6,15}$/)
  phoneNumber!: string;

  @IsOptional() @IsEmail() @MaxLength(320)
  email?: string;

  @IsString() @MinLength(2) @MaxLength(60)
  source!: string;

  @IsIn(services)
  service!: typeof services[number];

  @IsOptional() @IsInt() @Min(1) @Max(1000)
  expectedPassengers?: number;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) fullName?: string;
  @IsOptional() @Matches(/^\+[1-9]\d{0,3}$/) countryCode?: string;
  @IsOptional() @Matches(/^\d{6,15}$/) phoneNumber?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) source?: string;
  @IsOptional() @IsIn(services) service?: typeof services[number];
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}
