import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactMethod, JobListingType, JobType, WorkMode } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateJobDto {
  @ApiPropertyOptional({ enum: JobListingType, default: JobListingType.EMPLOYER })
  @IsOptional()
  @IsEnum(JobListingType)
  listingType?: JobListingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  company?: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'İş arayanlar için kısa özet' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  briefInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cvUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cvFileName?: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ enum: WorkMode })
  @IsEnum(WorkMode)
  workMode: WorkMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salaryRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  turkishFriendly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  germanLevel?: string;

  @ApiProperty({ enum: ContactMethod })
  @IsEnum(ContactMethod)
  contactMethod: ContactMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactValue?: string;
}
