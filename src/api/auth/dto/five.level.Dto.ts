import { ApiProperty } from '@nestjs/swagger';
import { Employee } from './createUserDto';

export class LevelFiveDto {
  @ApiProperty({ type: 'string', nullable: true, required: false })
  Employees: string;
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
    required: false,
  })
  boutique_images: [Express.Multer.File];
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
    required: false,
  })
  portfolio_images: [Express.Multer.File];
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
    required: false,
  })
  employees_images: [Express.Multer.File];
  @ApiProperty({ type: 'boolean', required: true })
  show_public_employees: string;
}
export class updateTeamDto {
  @ApiProperty({ type: 'string', nullable: true, required: false })
  employees: string;
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
    required: false,
  })
  employees_images: [Express.Multer.File];
  @ApiProperty({ type: 'boolean', required: true })
  show_public_employees: string;
}
export class updateTeamWebDto {
  @ApiProperty({ type: 'string', nullable: true, required: false })
  employees: string;
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
    required: false,
  })
  employees_images_web: [Express.Multer.File];
  @ApiProperty({ type: 'boolean', required: true })
  show_public_employees: string;
 
}
