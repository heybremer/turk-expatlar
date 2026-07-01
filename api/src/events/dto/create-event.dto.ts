import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  stateId: string;

  @ApiProperty()
  @IsString()
  cityId: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: PriceType })
  @IsOptional()
  @IsEnum(PriceType)
  priceType?: PriceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}
