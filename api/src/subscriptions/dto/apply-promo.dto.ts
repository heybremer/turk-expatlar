import { ApiProperty } from '@nestjs/swagger';
import { MembershipPlan } from '@prisma/client';
import { IsEnum, IsString, Length } from 'class-validator';

export class ApplyPromoDto {
  @ApiProperty()
  @IsString()
  @Length(3, 32)
  code: string;

  @ApiProperty({ enum: MembershipPlan, description: 'USER_YEARLY veya BUSINESS_YEARLY' })
  @IsEnum(MembershipPlan)
  plan: MembershipPlan;
}
