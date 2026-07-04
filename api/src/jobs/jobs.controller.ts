import {
  BadRequestException,
  Body,
  Controller,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JobListingType, JobType, WorkMode } from '@prisma/client';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';

// Uzantı, istemcinin dosya adından değil doğrulanmış MIME türünden türetilir
// (HTML/script yükleme koruması).
const CV_MIME_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};
const CV_ALLOWED_MIME = Object.keys(CV_MIME_EXT);
const CV_MAX_SIZE = 10 * 1024 * 1024;

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Get()
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'stateId', required: false })
  @ApiQuery({ name: 'jobType', required: false, enum: JobType })
  @ApiQuery({ name: 'workMode', required: false, enum: WorkMode })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'listingType', required: false, enum: JobListingType })
  @ApiQuery({ name: 'turkishFriendly', required: false })
  @ApiQuery({ name: 'search', required: false })
  findJobs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cityId') cityId?: string,
    @Query('stateId') stateId?: string,
    @Query('jobType') jobType?: JobType,
    @Query('workMode') workMode?: WorkMode,
    @Query('category') category?: string,
    @Query('listingType') listingType?: JobListingType,
    @Query('turkishFriendly') turkishFriendly?: string,
    @Query('search') search?: string,
  ) {
    return this.jobsService.findJobs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      cityId,
      stateId,
      jobType,
      workMode,
      category,
      listingType,
      turkishFriendly: turkishFriendly === 'true',
      search,
    });
  }

  @Post('upload-cv')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'cvs');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const ext = CV_MIME_EXT[file.mimetype] ?? '.bin';
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: CV_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (CV_ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
        else
          cb(
            new BadRequestException(
              'Sadece PDF veya Word dosyası yüklenebilir',
            ),
            false,
          );
      },
    }),
  )
  uploadCv(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/uploads/cvs/${file.filename}`;
    return {
      url,
      name: file.originalname,
      size: file.size,
    };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findJob(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.jobsService.findJob(id, user?.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createJob(@CurrentUser() user: { id: string }, @Body() dto: CreateJobDto) {
    return this.jobsService.createJob(user.id, dto);
  }

  @Patch(':id/close')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  closeJob(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.jobsService.closeJob(id, user.id);
  }
}
