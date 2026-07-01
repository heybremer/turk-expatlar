import { ApiProperty } from '@nestjs/swagger';
import { SupportCategory } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportCategory })
  @IsEnum(SupportCategory)
  category: SupportCategory;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  message: string;
}
