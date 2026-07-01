import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CourierDirection } from '@prisma/client';

export class CreateTravelAnnouncementDto {
  @IsEnum(CourierDirection)
  direction: CourierDirection;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fromCity: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  toCity: string;

  @IsDateString()
  departureDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  availableKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
