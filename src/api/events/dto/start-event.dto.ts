import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

export class StartEventDto { 
  @ApiProperty()
  eventId: string;
}
