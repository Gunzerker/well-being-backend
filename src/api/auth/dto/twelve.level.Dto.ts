import { ApiProperty } from '@nestjs/swagger';

export class LevelTwelveDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
  })
  files: [Express.Multer.File];
}
export class UpdatePhotosDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
  })
  photos: [Express.Multer.File];
}
export class UpdatePhotosTeamDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    isArray: true,
  })
  photos: [Express.Multer.File];
  @ApiProperty({
    description: `<hr><h3> - ⚠️It should be sorted as photos bellow⚠️</h3> <b> - Exemple: photos : [ photo1 , photo2 , photo3 ] , _ids : [ 1 , 2 , 3 ]</b><br>  **Each photo matching an id <hr>`,
    type: String,
    isArray: true,
  })
  _ids;
  @ApiProperty({
    type: Boolean,
    default: false,
    required: true,
  })
  show_public_employees: boolean;
}
