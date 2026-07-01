import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CourierPaymentType } from '@prisma/client';

export class CreateTravelRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  itemName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(20)
  weightKg?: number;

  @IsEnum(CourierPaymentType)
  paymentType: CourierPaymentType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
