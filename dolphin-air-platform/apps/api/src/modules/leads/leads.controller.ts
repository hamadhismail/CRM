import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { StaffAuthGuard, StaffAuthenticatedRequest } from '../auth/guards/staff-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateLeadDto, UpdateLeadDto } from './dto/create-lead.dto';

class LeadNoteDto { @IsString() @MinLength(1) @MaxLength(4000) body!: string; }
class LeadStatusDto { @IsIn(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_PENDING', 'NEGOTIATION', 'WON', 'LOST']) status!: string; }
import { LeadsService } from './leads.service';

@Controller('api/leads')
@UseGuards(StaffAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermissions('leads.read')
  list(@Req() request: StaffAuthenticatedRequest,
    @Query('take', new ParseIntPipe({ optional: true })) take = 25,
    @Query('cursor', new ParseUUIDPipe({ optional: true })) cursor?: string,
    @Query('state') state = 'active') {
    if (!['active', 'archived'].includes(state)) throw new BadRequestException('Invalid archive state');
    return this.leads.list(request.user!, Math.max(1, Math.min(take, 100)), cursor, state as 'active'|'archived');
  }

  @Post()
  @RequirePermissions('leads.create')
  create(@Req() request: StaffAuthenticatedRequest, @Body() body: CreateLeadDto) {
    return this.leads.create(request.user!, body);
  }

  @Get(':id')
  @RequirePermissions('leads.read')
  detail(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.detail(request.user!, id);
  }

  @Patch(':id')
  @RequirePermissions('leads.update')
  update(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateLeadDto) {
    return this.leads.update(request.user!, id, body);
  }

  @Patch(':id/status')
  @RequirePermissions('leads.update')
  status(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: LeadStatusDto) {
    return this.leads.setStatus(request.user!, id, body.status);
  }

  @Post(':id/notes')
  @RequirePermissions('leads.update')
  note(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: LeadNoteDto) {
    return this.leads.addNote(request.user!, id, body.body);
  }

  @Delete(':id')
  @RequirePermissions('leads.update')
  archive(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.archive(request.user!, id);
  }

  @Post(':id/restore')
  @RequirePermissions('leads.update')
  restore(@Req() request: StaffAuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.archive(request.user!, id, true);
  }
}
