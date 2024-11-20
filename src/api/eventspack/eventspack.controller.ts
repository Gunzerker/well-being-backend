import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventspackService } from './eventspack.service';
import { CreateEventspackDto } from './dto/create-eventspack.dto';
import { UpdateEventspackDto } from './dto/update-eventspack.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('events-pack-ressource')
@Controller('eventspack')
export class EventspackController {
  constructor(private readonly eventspackService: EventspackService) {}

  @Post()
  create(@Body() createEventspackDto: CreateEventspackDto) {
    return this.eventspackService.create(createEventspackDto);
  }

  @Get()
  findAll() {
    return this.eventspackService.findAll();
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.eventspackService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateEventspackDto: UpdateEventspackDto,
  // ) {
  //   return this.eventspackService.update(+id, updateEventspackDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.eventspackService.remove(+id);
  // }
}
