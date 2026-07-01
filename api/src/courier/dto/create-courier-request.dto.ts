import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourierDirection, CourierPaymentType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MinLength,
} from 'class-validator';

export class CreateCourierRequestDto {
  @ApiProperty({ enum: CourierDirection })
  @IsEnum(CourierDirection)
  direction: CourierDirection;

  @ApiProperty({ description: 'Şehir/semt (ülke + şehir önerilir)' })
  @IsString()
  @MinLength(2)
  fromArea: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  toArea: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  itemName: string;

  @ApiProperty({ description: 'electronics, hediye, kitap, kiyafet, ev-esyasi, diger' })
  @IsString()
  itemCategory: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Max(20)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'AB hediye limiti 430 €' })
  @IsOptional()
  @IsNumber()
  estimatedValueEur?: number;

  @ApiProperty({ enum: CourierPaymentType })
  @IsEnum(CourierPaymentType)
  paymentType: CourierPaymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paymentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiProperty({ description: 'Yasaklı eşya içermediğini onaylama' })
  @IsBoolean()
  forbiddenItemsAcknowledged: boolean;
}
