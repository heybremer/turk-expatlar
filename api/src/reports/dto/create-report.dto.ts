import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportTargetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;
}
