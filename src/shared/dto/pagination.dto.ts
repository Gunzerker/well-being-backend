import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class PaginationDto {
  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  page_size: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  page_number: number;
}

export class QueryOptions {
  offset?: number;
  limit?: number;
  fields?: string;
  text?: string;
}

export class FilterDto {
  @ApiProperty({ required: false, default: '', nullable: true })
  name?: string | null;
  @ApiProperty({ required: false, default: '', nullable: true })
  parentName?: string | null;
  @ApiProperty({ required: false, default: '', nullable: true })
  active?: boolean | null;
}
