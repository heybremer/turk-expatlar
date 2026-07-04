import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateUserReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  comment: string;
}
