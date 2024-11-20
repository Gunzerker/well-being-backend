import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ type: 'string', format: 'binary', nullable: true })
  image: Express.Multer.File;
  @ApiProperty()
  type: string;
  @ApiProperty()
  face_to_face: boolean;
  @ApiProperty()
  on_line: boolean;
  @ApiProperty()
  price_face_to_face: number;
  @ApiProperty()
  price_on_line: number;
  @ApiProperty()
  number_of_participant_face_to_face: number;
  @ApiProperty()
  number_of_participant_on_line: number;
  @ApiProperty()
  address: string;
  @ApiProperty()
  city: string;
  @ApiProperty()
  lat: number;
  @ApiProperty()
  lng: number;
  @ApiProperty()
  activity: string;
  @ApiProperty()
  event_name: string;
  @ApiProperty()
  start_date: Date;
  @ApiProperty()
  end_date: Date;
  @ApiProperty({ type: String, nullable: false, isArray: true })
  invited_users: [string];
  @ApiProperty()
  all: boolean;
  @ApiProperty()
  description:string
  @ApiProperty()
  formation:boolean
}
