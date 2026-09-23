import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class GoogleTwoFactorDto {
  @ApiProperty({ description: 'Google dönüşünde verilen kısa ömürlü bilet' })
  @IsString()
  @MaxLength(2048)
  ticket: string;

  @ApiProperty({ description: '6 haneli 2FA kodu' })
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}
