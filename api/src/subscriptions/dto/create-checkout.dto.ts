import { ApiProperty } from '@nestjs/swagger';
import { MembershipPlan } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ enum: [MembershipPlan.USER_YEARLY, MembershipPlan.BUSINESS_YEARLY] })
  @IsEnum(MembershipPlan)
  plan: MembershipPlan;
}
