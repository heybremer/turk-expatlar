import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportStatus, UserRole, SupportTicketStatus, ChatType, ChatBannedWordSeverity } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MinLength, IsArray } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { ForumBotService } from '../tasks/forum-bot.service';
import {
  AdminCreateBusinessDto,
  AdminCreateUserDto,
  AdminUpdateBusinessDto,
  AdminUpdateEventDto,
  AdminUpdateForumReplyDto,
  AdminUpdateForumTopicDto,
  AdminUpdateJobDto,
  AdminUpdateReviewDto,
} from './dto/admin.dto';

class BanUserDto {
  @IsOptional()
  @IsDateString()
  until?: string;
}

class ChangeRoleDto {
  @IsString()
  role: string;
}

class UpdateTrDefaultPagesDto {
  @IsArray()
  @IsString({ each: true })
  pages: string[];
}

class UpdateUserPagePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  allowedPages: string[];
}

class UpdateSupportTicketDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

class CreateChatChannelDto {
  @IsEnum(ChatType)
  type: ChatType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class AddBannedWordDto {
  @IsString()
  @MinLength(2)
  word: string;

  @IsOptional()
  @IsEnum(ChatBannedWordSeverity)
  severity?: ChatBannedWordSeverity;
}

class ToggleBannedWordDto {
  @IsBoolean()
  isActive: boolean;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private forumBot: ForumBotService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── Kullanıcılar ────────────────────────────────────────────────────────

  @Get('users')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'postalCountry', required: false, enum: ['DE', 'TR'] })
  listUsers(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('postalCountry') postalCountry?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? parseInt(page, 10) : 1,
      search,
      status,
      role,
      postalCountry,
    });
  }

  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users/banned')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  listBannedUsers(
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listBannedUsers({
      page: page ? parseInt(page, 10) : 1,
      search,
    });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string, @Body() dto: BanUserDto) {
    const until = dto.until ? new Date(dto.until) : undefined;
    return this.adminService.banUser(id, until);
  }

  @Patch('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Patch('users/:id/role')
  changeUserRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.adminService.changeUserRole(id, dto.role);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Get('page-permissions')
  getPagePermissionsConfig() {
    return this.adminService.getPagePermissionsConfig();
  }

  @Patch('page-permissions/tr-default')
  @Roles(UserRole.ADMIN)
  updateTrDefaultPages(@Body() dto: UpdateTrDefaultPagesDto) {
    return this.adminService.updateTrDefaultPages(dto.pages);
  }

  @Get('page-permissions/users')
  @ApiQuery({ name: 'country', required: true, enum: ['DE', 'TR'] })
  @ApiQuery({ name: 'page', required: false })
  listUsersByCountry(
    @Query('country') country: 'DE' | 'TR',
    @Query('page') page?: string,
  ) {
    return this.adminService.listUsersByCountry(
      country,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Patch('users/:id/page-permissions')
  @Roles(UserRole.ADMIN)
  updateUserPagePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateUserPagePermissionsDto,
  ) {
    return this.adminService.updateUserPagePermissions(id, dto.allowedPages);
  }

  @Delete('users/:id/page-permissions')
  @Roles(UserRole.ADMIN)
  resetUserPagePermissions(@Param('id') id: string) {
    return this.adminService.resetUserPagePermissions(id);
  }

  @Get('blocks')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  listBlocks(
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listBlocks({
      page: page ? parseInt(page, 10) : 1,
      search,
    });
  }

  @Delete('blocks/:id')
  removeBlock(@Param('id') id: string) {
    return this.adminService.removeBlock(id);
  }

  // ─── Forum ───────────────────────────────────────────────────────────────

  @Get('forum/topics')
  listForumTopics(@Query('page') page?: string, @Query('search') search?: string) {
    return this.adminService.listForumTopics({
      page: page ? parseInt(page, 10) : 1,
      search,
    });
  }

  @Get('forum/topics/:id')
  getForumTopic(@Param('id') id: string) {
    return this.adminService.getForumTopic(id);
  }

  @Patch('forum/topics/:id')
  updateForumTopic(@Param('id') id: string, @Body() dto: AdminUpdateForumTopicDto) {
    return this.adminService.updateForumTopic(id, dto);
  }

  @Delete('forum/topics/:id')
  deleteForumTopic(@Param('id') id: string) {
    return this.adminService.deleteForumTopic(id);
  }

  @Patch('forum/replies/:id')
  updateForumReply(@Param('id') id: string, @Body() dto: AdminUpdateForumReplyDto) {
    return this.adminService.updateForumReply(id, dto);
  }

  @Delete('forum/replies/:id')
  deleteForumReply(@Param('id') id: string) {
    return this.adminService.deleteForumReply(id);
  }

  // ─── Etkinlikler ─────────────────────────────────────────────────────────

  @Get('events')
  listEvents(
    @Query('page') page?: string,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listEvents({
      page: page ? parseInt(page, 10) : 1,
      filter,
      search,
    });
  }

  @Get('events/pending')
  getPendingEvents() {
    return this.adminService.getPendingEvents();
  }

  @Patch('events/:id')
  updateEvent(@Param('id') id: string, @Body() dto: AdminUpdateEventDto) {
    return this.adminService.updateEvent(id, dto);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id);
  }

  @Patch('events/:id/approve')
  approveEvent(@Param('id') id: string) {
    return this.adminService.approveEvent(id);
  }

  @Patch('events/:id/reject')
  rejectEvent(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectEvent(id, reason);
  }

  // ─── İşletmeler ──────────────────────────────────────────────────────────

  @Get('businesses/categories')
  getBusinessCategories() {
    return this.adminService.getBusinessCategories();
  }

  @Get('businesses/pending')
  getPendingBusinesses() {
    return this.adminService.getPendingBusinesses();
  }

  @Get('businesses/reviews')
  listBusinessReviews(@Query('page') page?: string, @Query('status') status?: string) {
    return this.adminService.listBusinessReviews({
      page: page ? parseInt(page, 10) : 1,
      status,
    });
  }

  @Patch('businesses/reviews/:id/approve')
  approveBusinessReview(@Param('id') id: string) {
    return this.adminService.approveBusinessReview(id);
  }

  @Patch('businesses/reviews/:id/reject')
  rejectBusinessReview(@Param('id') id: string) {
    return this.adminService.rejectBusinessReview(id);
  }

  @Patch('businesses/reviews/:id')
  updateBusinessReview(@Param('id') id: string, @Body() dto: AdminUpdateReviewDto) {
    return this.adminService.updateBusinessReview(id, dto);
  }

  @Delete('businesses/reviews/:id')
  deleteBusinessReview(@Param('id') id: string) {
    return this.adminService.deleteBusinessReview(id);
  }

  @Get('businesses')
  listBusinesses(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listBusinesses({
      page: page ? parseInt(page, 10) : 1,
      search,
      status,
    });
  }

  @Post('businesses')
  createBusiness(@Body() dto: AdminCreateBusinessDto) {
    return this.adminService.createBusiness(dto);
  }

  @Patch('businesses/:id/approve')
  approveBusiness(@Param('id') id: string) {
    return this.adminService.approveBusiness(id);
  }

  @Patch('businesses/:id')
  updateBusiness(@Param('id') id: string, @Body() dto: AdminUpdateBusinessDto) {
    return this.adminService.updateBusiness(id, dto);
  }

  @Delete('businesses/:id')
  deleteBusiness(@Param('id') id: string) {
    return this.adminService.deleteBusiness(id);
  }

  // ─── Raporlar ────────────────────────────────────────────────────────────

  @Get('reports')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  listReports(
    @Query('page') page?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listReports({
      page: page ? parseInt(page, 10) : 1,
      status,
    });
  }

  @Get('reports/stats')
  getReportStats() {
    return this.adminService.getReportStats();
  }

  @Patch('reports/:id/resolve')
  resolveReport(@Param('id') id: string) {
    return this.adminService.resolveReport(id, ReportStatus.RESOLVED, 'system');
  }

  // ─── İş ilanları ─────────────────────────────────────────────────────────

  @Get('jobs')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  listJobs(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listJobs({
      page: page ? parseInt(page, 10) : 1,
      search,
      status,
    });
  }

  @Get('jobs/pending')
  getPendingJobs() {
    return this.adminService.getPendingJobs();
  }

  @Patch('jobs/:id/approve')
  approveJob(@Param('id') id: string) {
    return this.adminService.approveJob(id);
  }

  @Patch('jobs/:id/reject')
  rejectJob(@Param('id') id: string) {
    return this.adminService.rejectJob(id);
  }

  @Patch('jobs/:id')
  updateJob(@Param('id') id: string, @Body() dto: AdminUpdateJobDto) {
    return this.adminService.updateJob(id, dto);
  }

  @Delete('jobs/:id')
  deleteJob(@Param('id') id: string) {
    return this.adminService.deleteJob(id);
  }

  @Get('courier/requests')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  listCourierRequests(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listCourierRequests({
      page: page ? parseInt(page, 10) : 1,
      search,
      status,
    });
  }

  @Delete('courier/requests/:id')
  deleteCourierRequest(@Param('id') id: string) {
    return this.adminService.deleteCourierRequest(id);
  }

  @Get('courier/carry-relations')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'phase', required: false })
  listCourierCarryRelations(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('phase') phase?: string,
  ) {
    return this.adminService.listCourierCarryRelations({
      page: page ? parseInt(page, 10) : 1,
      search,
      phase,
    });
  }

  @Get('support')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  listSupportTickets(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.adminService.listSupportTickets({
      page: page ? parseInt(page, 10) : 1,
      search,
      status,
      category,
    });
  }

  @Patch('support/:id')
  updateSupportTicket(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.adminService.updateSupportTicket(id, dto);
  }

  @Get('chat/channels')
  listChatChannels() {
    return this.adminService.listChatChannels();
  }

  @Post('chat/channels')
  createChatChannel(@Body() dto: CreateChatChannelDto) {
    return this.adminService.createChatChannel(dto);
  }

  @Get('chat/banned-words')
  listChatBannedWords() {
    return this.adminService.listChatBannedWords();
  }

  @Post('chat/banned-words/seed-defaults')
  seedDefaultBannedWords() {
    return this.adminService.seedDefaultBannedWords();
  }

  @Post('chat/banned-words')
  addChatBannedWord(@Body() dto: AddBannedWordDto) {
    return this.adminService.addChatBannedWord(
      dto.word,
      dto.severity ?? ChatBannedWordSeverity.CRITICAL,
    );
  }

  @Delete('chat/banned-words/:id')
  removeChatBannedWord(@Param('id') id: string) {
    return this.adminService.removeChatBannedWord(id);
  }

  @Patch('chat/banned-words/:id')
  toggleChatBannedWord(
    @Param('id') id: string,
    @Body() dto: ToggleBannedWordDto,
  ) {
    return this.adminService.toggleChatBannedWord(id, dto.isActive);
  }

  @Get('chat/moderation-logs')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'reason', required: false })
  @ApiQuery({ name: 'autoBannedOnly', required: false })
  listChatModerationLogs(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('reason') reason?: string,
    @Query('autoBannedOnly') autoBannedOnly?: string,
  ) {
    return this.adminService.listChatModerationLogs({
      page: page ? parseInt(page, 10) : 1,
      search,
      reason,
      autoBannedOnly: autoBannedOnly === 'true',
    });
  }

  @Patch('chat/spam-unban/:userId')
  unbanChatUser(@Param('userId') userId: string) {
    return this.adminService.unbanChatUser(userId);
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  @Get('analytics/content')
  @ApiQuery({ name: 'days', required: false })
  getContentAnalytics(@Query('days') days?: string) {
    return this.adminService.getContentAnalytics(days ? parseInt(days, 10) : 30);
  }

  // ─── Forum Bot ─────────────────────────────────────────────────────────────

  @Get('forum-bot/dashboard')
  getForumBotDashboard() {
    return this.forumBot.getDashboardData();
  }

  @Post('forum-bot/post-now')
  triggerForumBotPost() {
    return this.forumBot.postNow();
  }
}
