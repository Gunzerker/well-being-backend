import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/decorators/decotator.user';
import { User } from '../users/models/user.model';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { TransfertPaymentDto } from './dto/transfert-payment.dto';
@ApiTags('wallet-ressources')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  create(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.create(createWalletDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  fetchPerformance(@GetUser() user: User, @Query('year') year: string) {
    return this.walletService.fetchPerformance(year, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/fetchSubInvoice')
  @ApiQuery({ name: 'search', required: false })
  fetchSubInvoice(
    @GetUser() user: User,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
    @Query('search') search: string,
  ) {
    return this.walletService.fetchSubInvoice(
      page_size,
      page_number,
      search,
      user,
      from_date,
      to_date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/exportSubInvoice')
  exportSubInvoice(
    @GetUser() user: User,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
  ) {
    return this.walletService.exportSubInvoice(user, from_date, to_date);
  }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/fetchEventInvoice')
  @ApiQuery({ name: 'search', required: false })
  fetchEventInvoice(
    @GetUser() user: User,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
    @Query('search') search: string,
  ) {
    return this.walletService.fetchEventInvoice(
      page_size,
      page_number,
      search,
      user,
      from_date,
      to_date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/exportEventInvoice')
  exportEventInvoice(
    @GetUser() user: User,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
  ) {
    return this.walletService.exportEventInvoice(user, from_date, to_date);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/fetchAppointmentInvoice')
  @ApiQuery({ name: 'search', required: false })
  fetchAppointmentInvoice(
    @GetUser() user: User,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
    @Query('search') search: string,
  ) {
    return this.walletService.fetchAppointmentInvoice(
      page_size,
      page_number,
      search,
      user,
      from_date,
      to_date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/exportAppointmentInvoice')
  exportAppointmentInvoice(
    @GetUser() user: User,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
  ) {
    return this.walletService.exportAppointmentInvoice(
      user,
      from_date,
      to_date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/fetchEventPackInvoice')
  @ApiQuery({ name: 'search', required: false })
  fetchEventPackInvoice(
    @GetUser() user: User,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
    @Query('search') search: string,
  ) {
    return this.walletService.fetchEventPackInvoice(
      page_size,
      page_number,
      search,
      user,
      from_date,
      to_date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/exportEventPackInvoice')
  exportEventPackInvoice(
    @GetUser() user: User,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
  ) {
    return this.walletService.exportEventPackInvoice(user, from_date, to_date);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/transfertPayment')
  transfertPayment(
    @GetUser() user: User,
    @Body() transfertPaymentDto: TransfertPaymentDto,
  ) {
    return this.walletService.transfertPayment(transfertPaymentDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/transfertPayment')
  transfertPaymentDetails(
    @GetUser() user: User,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
  ) {
    return this.walletService.transfertPaymentDetails(
      page_size,
      page_number,
      user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'search', required: false })
  @Get('/clientInvoice')
  clientInvoice(
    @GetUser() user: User,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
    @Query('search') search: string,
  ) {
    return this.walletService.clientInvoice(
      page_size,
      page_number,
      search,
      user,
      from_date,
      to_date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/exportClientInvoice')
  exportClientInvoice(
    @GetUser() user: User,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
  ) {
    return this.walletService.exportClientInvoice(user, from_date, to_date);
  }

  @Get('/internal-endpoint')
  async update(){
    await this.walletService.updateAllWallets()
  }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/fetchStripeWallet')
  fetchStripeWallet(
    @GetUser() user: User,
  ) {
    return this.walletService.fetchStripeWallet(user);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.walletService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateWalletDto: UpdateWalletDto) {
  //   return this.walletService.update(+id, updateWalletDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.walletService.remove(+id);
  // }
}
