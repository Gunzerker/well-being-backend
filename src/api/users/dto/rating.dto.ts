import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class RatingDto {
  @ApiProperty()
  value: number;
  @ApiProperty()
  comment: string;
  @ApiProperty()
  appointementId: string;
}

export class fetchRatingDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  page_number: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  page_size: number;

  @ApiProperty()
  search: string;

  @ApiProperty()
  ratingId: string;
  @ApiProperty()
  flagedByAdmin: boolean;
}
