import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReplyDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  body: string;

  @ApiPropertyOptional({ description: 'Üst cevap ID (1 seviye thread)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
