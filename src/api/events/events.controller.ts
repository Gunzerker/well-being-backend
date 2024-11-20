import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Logger,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { GetUser } from 'src/decorators/decotator.user';
import { User } from '../users/models/user.model';
import mongoose from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { StartEventDto } from './dto/start-event.dto';
import { CheckTimeValidatorEventPipe } from 'src/pipes/timeValidator';
import { SubscriptionGuard } from 'src/guard/subscription.access.guard';
import { UserToken } from 'src/shared/tokenModel';
import { SubscriptionGuardPermission } from 'src/guard/permission.subscription.guard';
import { Cron, SchedulerRegistry } from '@nestjs/schedule/dist';
import { CronTime } from 'cron';
@ApiTags('events-ressource')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService,
 ) { }


 


  @ApiConsumes('multipart/form-data')
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiBody({
    type: CreateEventDto,
  })
  create(
    @Body() createEventDto: CreateEventDto,
    @GetUser() user: User,
    @UploadedFile() file,
  ) {
    if (createEventDto.invited_users) {
      if (typeof createEventDto.invited_users == 'string')
        createEventDto.invited_users = [createEventDto.invited_users];
    }
    return this.eventsService.create(createEventDto, user, file);
  }

  @Get('/fetchMyClients')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'eventId', required: false })
  findMyClients(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('search') search: string,
    @Query('eventId') eventId: string,

    @GetUser() user: User,
  ) {
    return this.eventsService.findMyClients(
      page_size,
      page_number,
      search,
      eventId,
      user,
    );
  }

  @Get('/fetchEventParticipants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiQuery({ name: 'search', required: false })
  fetchEventParticipants(
    @Query('eventId') eventId: string,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('search') search: string,
    @Query('online') online: boolean,
    @GetUser() user: User,
  ) {
    return this.eventsService.fetchEventParticipants(
      page_size,
      page_number,
      search,
      user,
      online,
      eventId,
    );
  }

  @Get('/findEventById')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  findEventById(@Query('eventId') eventId: string, @GetUser() user: User) {
    return this.eventsService.findEventById(eventId, user);
  }

  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category_id', required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  findAll(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('search') search: string,
    @Query('category_id') categoryId: string,
    @Query('available') available: boolean,
    @GetUser() user: User,
  ) {
    return this.eventsService.findAll(
      page_size,
      page_number,
      search,
      categoryId,
      available,
      user,
    );
  }

  @Get('/fetchProEvents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  fetchProEvents(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('passed') passed: boolean,
    @GetUser() user: User,
  ) {
    return this.eventsService.fetchProEvents(
      page_size,
      page_number,
      passed,
      user,
    );
  }

  @Get('/cancelEvent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  cancelEvent(@Query('eventId') eventId: string, @GetUser() user: UserToken) {
    return this.eventsService.cancelEvent(eventId, user);
  }

  @Get('share-event/:event_id')
  findOne(@Param('event_id') event_id: string) {
    return this.eventsService.shareEventService(event_id);
  }

  // @ApiConsumes('multipart/form-data')
  // @Post()
  // @UseInterceptors(FileInterceptor('image'))
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiBody({
  //   type: CreateEventDto,
  // })
  // create(
  //   @Body() createEventDto: CreateEventDto,
  //   @GetUser() user: User,
  //   @UploadedFile() file,
  // );

  @ApiConsumes('multipart/form-data')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiBody({
    type: UpdateEventDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFile() file,
  ) {
    if (updateEventDto.invited_users) {
      if (typeof updateEventDto.invited_users == 'string')
        updateEventDto.invited_users = [updateEventDto.invited_users];
    }
    return this.eventsService.update(id, updateEventDto, file);
  }

  @Get('/cancelEventParticipation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  cancelEventParticipation(
    @Query('eventId') eventId: string,
    @GetUser() user: User,
  ) {
    return this.eventsService.cancelEventParticipation(eventId, user);
  }

  @Post('/startEvent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  startEvent(@Body() startEventDto: StartEventDto, @GetUser() user: User) {
    return this.eventsService.startEvent(startEventDto, user);
  }

  @Post('/endEvent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  endEvent(@Body() startEventDto: StartEventDto, @GetUser() user: User) {
    return this.eventsService.endEvent(startEventDto, user);
  }

  @Get('/joinAppointmentOnline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  joinAppointmentOnline(
    @Query('eventId') eventId: string,
    //@GetUser() user: User,
  ) {
    return this.eventsService.joinAppointmentOnline(eventId);
  }
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.eventsService.remove(+id);
  // }
}
