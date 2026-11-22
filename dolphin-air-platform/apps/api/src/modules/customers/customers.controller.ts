import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { StaffAuthGuard, StaffAuthenticatedRequest } from '../auth/guards/staff-auth.guard';
import { CreateCustomerDto, CustomerContactDto, CustomerDuplicateCheckDto, CustomerLeadConversionDto, CustomerListQueryDto, UpdateCustomerDto } from './dto/customers.dto';
import { CustomersService } from './customers.service';

@Controller('api/customers')
@UseGuards(StaffAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('summary')
  @RequirePermissions('customers.read')
  summary(@Req() request: StaffAuthenticatedRequest) { return this.customers.summary(request.user!); }

  @Post('duplicates')
  @RequirePermissions('customers.read')
  duplicates(@Req() request: StaffAuthenticatedRequest, @Body() body: CustomerDuplicateCheckDto) { return this.customers.duplicates(request.user!, body); }

  @Get('contacts')
  @RequirePermissions('contacts.read')
  listContacts(@Req() request: StaffAuthenticatedRequest, @Query() query: CustomerListQueryDto) { return this.customers.listContacts(request.user!, query); }

  @Get('lead-conversion/:leadId')
  @RequirePermissions('customers.convert')
  conversionPreview(@Req() request: StaffAuthenticatedRequest, @Param('leadId', new ParseUUIDPipe()) leadId: string) { return this.customers.leadConversionPreview(request.user!, leadId); }

  @Post('convert-lead/:leadId')
  @RequirePermissions('customers.convert')
  convertLead(@Req() request: StaffAuthenticatedRequest, @Param('leadId', new ParseUUIDPipe()) leadId: string, @Body() body: CustomerLeadConversionDto) { return this.customers.convertLead(request.user!, leadId, body); }

  @Get()
  @RequirePermissions('customers.read')
  list(@Req() request: StaffAuthenticatedRequest, @Query() query: CustomerListQueryDto) { return this.customers.list(request.user!, query); }

  @Post()
  @RequirePermissions('customers.create')
  create(@Req() request: StaffAuthenticatedRequest, @Body() body: CreateCustomerDto) { return this.customers.create(request.user!, body); }

  @Get(':id/contacts')
  @RequirePermissions('contacts.read')
  contacts(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.customers.contacts(request.user!, id); }

  @Post(':id/contacts')
  @RequirePermissions('contacts.create')
  addContact(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: CustomerContactDto) { return this.customers.addContact(request.user!, id, body); }

  @Patch(':id/contacts/:contactId')
  @RequirePermissions('contacts.update')
  updateContact(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('contactId', new ParseUUIDPipe()) contactId: string, @Body() body: CustomerContactDto) { return this.customers.updateContact(request.user!, id, contactId, body); }

  @Get(':id/activities')
  @RequirePermissions('customers.read')
  activities(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.customers.listActivities(request.user!, id); }

  @Get(':id/leads')
  @RequirePermissions('customers.read')
  leads(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.customers.customerLeads(request.user!, id); }

  @Get(':id')
  @RequirePermissions('customers.read')
  detail(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.customers.detail(request.user!, id); }

  @Patch(':id')
  @RequirePermissions('customers.update')
  update(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateCustomerDto) { return this.customers.update(request.user!, id, body); }

  @Post(':id/archive')
  @RequirePermissions('customers.archive')
  archive(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.customers.archive(request.user!, id); }

  @Post(':id/restore')
  @RequirePermissions('customers.restore')
  restore(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.customers.archive(request.user!, id, true); }
}
