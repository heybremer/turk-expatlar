import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ required: false, description: '6 haneli 2FA kodu' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  code?: string;
}
