import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from './users.service';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.getMe(user.id);
  }

  @Get('me/referrals')
  getMyReferrals(@CurrentUser() user: { id: string }) {
    return this.usersService.getMyReferrals(user.id);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.usersService.getLeaderboard(
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('search')
  searchUsers(@CurrentUser() user: { id: string }, @Query('q') q: string) {
    return this.usersService.searchUsers(q ?? '', user.id);
  }

  @Patch('me/profile')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'avatars');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE },
      fileFilter: (_req, file, cb) => {
        if (AVATAR_MIME.includes(file.mimetype)) cb(null, true);
        else
          cb(
            new BadRequestException('Yalnızca JPEG, PNG, WebP veya GIF'),
            false,
          );
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    const url = `${req.protocol}://${req.get('host')}/uploads/avatars/${file.filename}`;
    await this.usersService.updateAvatar(user.id, url);
    return { avatarUrl: url };
  }

  @Delete('me')
  deleteAccount(@CurrentUser() user: { id: string }) {
    return this.usersService.deleteAccount(user.id);
  }

  @Get('blocked')
  listBlocked(@CurrentUser() user: { id: string }) {
    return this.usersService.listBlockedUsers(user.id);
  }

  @Get(':userId/block-status')
  getBlockStatus(
    @CurrentUser() user: { id: string },
    @Param('userId') userId: string,
  ) {
    return this.usersService.getBlockStatus(user.id, userId);
  }

  @Post(':userId/block')
  blockUser(
    @CurrentUser() user: { id: string },
    @Param('userId') userId: string,
  ) {
    return this.usersService.blockUser(user.id, userId);
  }

  @Delete(':userId/block')
  unblockUser(
    @CurrentUser() user: { id: string },
    @Param('userId') userId: string,
  ) {
    return this.usersService.unblockUser(user.id, userId);
  }
}
