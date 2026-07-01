import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ali@example.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  email: string;
}
