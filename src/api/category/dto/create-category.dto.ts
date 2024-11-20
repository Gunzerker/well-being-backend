import { ApiProperty } from '@nestjs/swagger';

export class Translator {
  @ApiProperty({ required: true })
  fr: string;
  @ApiProperty({ required: true })
  en: string;
  @ApiProperty({ required: false })
  it: string;
  @ApiProperty({ required: false })
  es: string;
  @ApiProperty({ required: false })
  de: string;
}

export class CreateCategoryDto {
  @ApiProperty({ required: true })
  active: boolean;
  @ApiProperty({ required: true, type: Translator })
  content: any;
  @ApiProperty({ required: false, nullable: true })
  name: string;
  @ApiProperty({ required: false, type: String, nullable: true, default: null })
  parentCategory: string | null;
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    nullable: true,
    default: null,
  })
  imageUrl: Express.Multer.File;
}
export class UpdateCategoryDto {
  @ApiProperty({ required: true })
  active: boolean;
  @ApiProperty({ required: false, type: Translator })
  content: any;
  @ApiProperty({ required: false, nullable: true })
  name: string;
  @ApiProperty({ required: false, type: String, nullable: true })
  parentCategory: string | null;
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  image: Express.Multer.File;
}
