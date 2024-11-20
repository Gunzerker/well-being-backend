import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from 'src/decorators/decotator.user';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { UserToken } from 'src/shared/tokenModel';
import { User } from '../users/models/user.model';
import { AppointmentService } from './appointment.service';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FetchAvailibilityDto } from './dto/fetch-availibility.dto';
import { DecideAppointmentDto } from './dto/decide-appointment.dto';
import { PostponeAppointmentDto } from './dto/postponeAppointment.dto';
import { FetchAppointmentByDateDto } from './dto/fetch-appointment-by-date';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { StartAppointmentDto } from './dto/start-appointment.dto';
import { CreateExternalAppointmentDto } from './dto/create-external-appointment.dto';
import { FetchAvailibilityExternalDto } from './dto/fetch-availibility-external.dto';
import { FetchAgendaDto } from './dto/fetch-agenda.dto';
import { stringMap } from 'aws-sdk/clients/backup';
import { SubscriptionGuardPermission } from 'src/guard/permission.subscription.guard';
import { userInfo } from 'os';
@ApiTags('appointment-ressource')
@Controller('appointment')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // @Post()
  // create(@Body() createAppointmentDto: CreateAppointmentDto) {
  //   return this.appointmentService.create(createAppointmentDto);
  // }

  @Get('/findMyAppointments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'search', required: false })
  findMyAppointments(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('search') search: string,
    @GetUser() user: User,
  ) {
    // page_size ? (page_size = page_size) : (page_size = 10);

    return this.appointmentService.findMyAppointments(
      page_size,
      page_number,
      user,
      search,
    );
  }

  @Get('/findMyAppointmentsClient')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'filter',
    required: true,
    enum: ['Pending', 'Accepted', 'PostPoned'],
  })
  findMyAppointmentsClient(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('search') search: string,
    @Query('filter') filter: string,
    @GetUser() user: User,
  ) {
    return this.appointmentService.findMyAppointmentsClient(
      page_size,
      page_number,
      user,
      search,
      filter,
    );
  }

  @Post('/fetchEmployeeDisponibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  fetchAvailableEmployee(
    @Body() fetchAvailibilityDto: FetchAvailibilityDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.fetchAvailableEmployee(
      fetchAvailibilityDto.appointmentId,
      user,
    );
  }

  @Post('/assignAppointments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  assign(
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.assign(updateAppointmentDto, user);
  }

  @Post('/decideAppointments')
  @ApiOperation({ summary: 'decision takes either Accepted, Refused' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  decideAppointments(
    @Body() decideAppointmentDto: DecideAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.decideAppointments(
      decideAppointmentDto,
      user,
    );
  }

  @Get('/fetchAppointmentsAgenda')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiQuery({ name: 'employeeId', required: false })
  fetchAppointmentsAgenda(
    @Query('start_date') start_date: string,
    @Query('end_date') end_date: string,
    @Query('employeeId') employeeId: string,
    @Query('remote_group') remote_group: Boolean,
    //@GetUser() user: User,
  ) {
    return this.appointmentService.fetchAppointmentsAgenda(
      start_date,
      end_date,
      employeeId,
      remote_group,
    );
  }

  @Post('/postponeAppoitment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  postponeAppoitment(
    @Body() postponeAppointmentDto: PostponeAppointmentDto,
    @GetUser() user: UserToken,
  ) {
    return this.appointmentService.postponeAppoitment(
      postponeAppointmentDto,
      user,
    );
  }

  @Get('/decidePostponeAppoitment')
  @ApiBearerAuth()
  @ApiQuery({
    name: 'decision',
    required: true,
    enum: ['Accepted', 'Refused'],
  })
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  decidePostponeAppoitment(
    @Query('appointmentId') appointmentId: string,
    @Query('decision') decision: string,
    //@GetUser() user: User,
  ) {
    return this.appointmentService.decidePostponeAppoitment(
      appointmentId,
      decision,
    );
  }

  @Post('/cancelAppoitment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  cancelAppoitment(
    @Body() cancelAppointmentDto: CancelAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.cancelAppointment(
      cancelAppointmentDto,
      user,
    );
  }

  @Post('/startAppointment')
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiBearerAuth()
  startAppointment(
    @Body()
    startAppointmentDto: StartAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.startAppointment(startAppointmentDto, user);
  }

  @Post('/endAppointment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  endAppointment(
    @Body() endAppointmentDto: StartAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.endAppointment(endAppointmentDto, user);
  }

  @Get('/joinAppointmentOnline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  joinAppointmentOnline(
    @Query('appointmentInstanceId') appointmentInstanceId: string,
    //@GetUser() user: User,
  ) {
    return this.appointmentService.joinAppointmentOnline(appointmentInstanceId);
  }

  @Post('/takeExternalAppointment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  takeExternalAppointment(
    @Body() externalAppointmentDto: CreateExternalAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.takeExternalAppointment(
      externalAppointmentDto,
      user,
    );
  }

  @Post('/fetchEmployeeDisponibilityExternal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @HttpCode(200)
  fetchAvailableEmployeeExternal(
    @Body() fetchAvailibilityDto: FetchAvailibilityExternalDto,
    @GetUser() user: User,
  ) {
    return this.appointmentService.fetchAvailableEmployeeExternal(
      fetchAvailibilityDto,
      user,
    );
  }

  @Post('/fetchAgenda')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @HttpCode(200)
  fetchAgenda(@Body() fetchAgendaDto: FetchAgendaDto, @GetUser() user: User) {
    return this.appointmentService.fetchAgenda(fetchAgendaDto, user);
  }

  @Post('find-all-appointment')
  findAll(@Body() fetchAppointmentByDateDto: FetchAppointmentByDateDto) {
    return this.appointmentService.findAll(fetchAppointmentByDateDto);
  }

  @Post('/turnover')
  fetchTurnover(@Body() fetchAppointmentByDateDto: FetchAppointmentByDateDto) {
    return this.appointmentService.fetchTurnover(fetchAppointmentByDateDto);
  }

  @Get('handleNoShowNotification')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  handleNoShowNotif(
    @Query('appointmentId') appointmentId: string,
    @Query('idNotif') idNotif: string,
    @Query('decision') decision: boolean,
  ) {
    return this.appointmentService.handleNoShowNotif(
      appointmentId,
      decision,
      idNotif,
    );
  }

  @Get('noShowPro')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  async noShowPro(
    @Query('appointmentId') appointmentId: string,
    @GetUser() user: User,
  ) {
    return await this.appointmentService.handleNoShowPro(appointmentId, user);
  }
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @Get('reset-post-can-runover')
  // async reset(@GetUser() me, @Query() type: string) {
  //   return await this.appointmentService.resetServiceForAdmin(me, type);
  // }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentService.findOneController(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
  //   return this.appointmentService.update(+id, updateAppointmentDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.appointmentService.remove(+id);
  // }
}
