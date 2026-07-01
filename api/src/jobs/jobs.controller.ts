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
import { extname, join } from 'path';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';

const CV_ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
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
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: CV_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (CV_ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Sadece PDF, Word veya metin dosyası yüklenebilir'), false);
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
  findJob(@Param('id') id: string) {
    return this.jobsService.findJob(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createJob(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.createJob(user.id, dto);
  }

  @Patch(':id/close')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  closeJob(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.jobsService.closeJob(id, user.id);
  }
}
