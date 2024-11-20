import { PartialType } from '@nestjs/mapped-types';
import { CreateEventspackDto } from './create-eventspack.dto';

export class UpdateEventspackDto extends PartialType(CreateEventspackDto) {}
