import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ForumTopicStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { RequireFeature } from '../common/decorators/require-feature.decorator';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { ForumService } from './forum.service';

@ApiTags('forum')
@RequireFeature('forum')
@Controller('forum')
export class ForumController {
  constructor(private forumService: ForumService) {}

  @Get('categories')
  getCategories() {
    return this.forumService.getCategories();
  }

  @Get('topics')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'stateId', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ForumTopicStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['newest', 'views', 'replies', 'likes'],
    description: 'newest | views (en çok okunan) | replies (en çok yorum) | likes (en çok beğenilen)',
  })
  findTopics(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('stateId') stateId?: string,
    @Query('cityId') cityId?: string,
    @Query('status') status?: ForumTopicStatus,
    @Query('search') search?: string,
    @Query('sort') sort?: 'newest' | 'views' | 'replies' | 'likes',
  ) {
    return this.forumService.findTopics({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      categoryId,
      stateId,
      cityId,
      status,
      search,
      sort,
    });
  }

  @Get('topics-feed')
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'sort', required: false })
  findTopicsFeed(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sort') sort?: 'newest' | 'views' | 'replies' | 'likes',
  ) {
    return this.forumService.findTopicsCursor({
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      categoryId,
      sort,
    });
  }

  @Get('topics/:id')
  @UseGuards(OptionalJwtAuthGuard)
  findTopic(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.forumService.findTopic(id, user?.id);
  }

  @Patch('topics/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateTopic(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTopicDto,
  ) {
    return this.forumService.updateTopic(id, user.id, dto);
  }

  @Delete('topics/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTopic(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.forumService.deleteTopic(id, user.id);
  }

  @Patch('replies/:replyId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateReply(
    @Param('replyId') replyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateReplyDto,
  ) {
    return this.forumService.updateReply(replyId, user.id, dto);
  }

  @Delete('replies/:replyId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReply(
    @Param('replyId') replyId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.forumService.deleteReply(replyId, user.id);
  }

  @Post('topics/:id/me-too')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  toggleInterest(
    @Param('id') topicId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.forumService.toggleInterest(topicId, user.id);
  }

  @Post('topics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // dakikada max 5 konu
  createTopic(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTopicDto,
  ) {
    return this.forumService.createTopic(user.id, dto);
  }

  @Post('topics/:id/replies')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // dakikada max 10 cevap
  createReply(
    @Param('id') topicId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReplyDto,
  ) {
    return this.forumService.createReply(topicId, user.id, dto);
  }

  @Post('topics/:id/solve/:replyId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markSolved(
    @Param('id') topicId: string,
    @Param('replyId') replyId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.forumService.markSolved(topicId, user.id, replyId);
  }

  @Post('replies/:replyId/vote')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  toggleReplyVote(
    @Param('replyId') replyId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.forumService.toggleReplyVote(replyId, user.id);
  }

  // ─── Poll ──────────────────────────────────────────────────────────────────

  @Post('topics/:id/poll')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createPoll(
    @Param('id') topicId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { question: string; options: string[]; endsAt?: string },
  ) {
    return this.forumService.createPoll(topicId, user.id, body);
  }

  @Post('polls/:optionId/vote')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  votePoll(
    @Param('optionId') optionId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.forumService.votePoll(optionId, user.id);
  }

  @Get('topics/:id/poll')
  @UseGuards(OptionalJwtAuthGuard)
  getPoll(
    @Param('id') topicId: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.forumService.getPoll(topicId, user?.id);
  }
}
