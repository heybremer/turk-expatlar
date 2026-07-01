import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PostalCountry } from '@prisma/client';

import {

  IsArray,

  IsBoolean,

  IsEmail,

  IsEnum,

  IsOptional,

  IsString,

  Matches,

  MinLength,

  ValidateIf,

} from 'class-validator';



export class RegisterDto {

  @ApiProperty({ example: 'user@example.com' })

  @IsEmail()

  email: string;



  @ApiProperty({ minLength: 8 })

  @IsString()

  @MinLength(8)

  password: string;



  @ApiProperty({ example: 'Ahmet Yılmaz' })

  @IsString()

  displayName: string;



  @ApiProperty({ enum: PostalCountry, example: PostalCountry.DE })

  @IsEnum(PostalCountry)

  postalCountry: PostalCountry;



  @ApiPropertyOptional()

  @ValidateIf((o) => o.postalCountry === PostalCountry.DE)

  @IsString()

  stateId?: string;



  @ApiPropertyOptional()

  @ValidateIf((o) => o.postalCountry === PostalCountry.DE)

  @IsString()

  cityId?: string;



  @ApiProperty({ example: '50667', description: 'Posta kodu (5 hane)' })

  @IsString()

  @Matches(/^\d{5}$/, { message: 'Geçerli bir 5 haneli posta kodu girin' })

  postalCode: string;



  @ApiProperty()

  @IsBoolean()

  gdprConsent: boolean;



  @ApiPropertyOptional()

  @IsOptional()

  @IsArray()

  @IsString({ each: true })

  languages?: string[];



  @ApiPropertyOptional()

  @IsOptional()

  @IsArray()

  @IsString({ each: true })

  interests?: string[];



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  userStatus?: string;



  @ApiPropertyOptional({ example: 'ABC12345', description: 'Davet eden üyenin referans kodu' })

  @IsOptional()

  @IsString()

  referralCode?: string;

}

