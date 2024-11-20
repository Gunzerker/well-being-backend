import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    required: false,
  })
  image;
  @ApiProperty({ required: false })
  number_of_participant_face_to_face: number;
  @ApiProperty({ required: false })
  number_of_participant_on_line: number;
  @ApiProperty({ required: false })
  event_name: string;
  @ApiProperty({ type: String, nullable: false, isArray: true })
  invited_users: [string];
  @ApiProperty()
  description: string;
  @ApiProperty()
  formation: boolean;
}
