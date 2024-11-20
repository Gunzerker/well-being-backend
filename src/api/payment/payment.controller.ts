import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Redirect,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CreatePaymentSubDto, turnoverByProDto, createCouponDto } from './dto/create-payment-sub.dto';
import { FetchDiscounts } from './dto/fetch-all-discounts.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { GetUser } from 'src/decorators/decotator.user';
import { User } from '../users/models/user.model';
import { CheckDevisAppointmentPipe } from 'src/pipes/checkDevisAppointment';
import { SubscriptionGuard } from 'src/guard/subscription.access.guard';
import { CouponValidatorPipe } from 'src/pipes/couponValidator';
import { SubscriptionGuardPermission } from 'src/guard/permission.subscription.guard';
import { log } from 'console';

@ApiTags('payment-ressource')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('/webhook')
  paymentWebhook(@Body() data) {
    console.log('** Intercepted by Webhook **');
    return this.paymentService.paymentWebhook(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @UsePipes(CheckDevisAppointmentPipe)
  @ApiBearerAuth()
  async createPaymentIntent(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() user: User,
  ) {
    console.log("****************************")
    console.log(createPaymentDto)
    console.log("****************************")
    return this.paymentService.createPaymentIntent(createPaymentDto, user);
  }

  @Post('/subscription')
  createPaymentSub(
    @Body(CouponValidatorPipe) createPaymentSubDto: CreatePaymentSubDto,
  ) {
    return this.paymentService.createPaymentSub(createPaymentSubDto);
  }

  @Post('/updateSubscription')
  updateSubscription(@Body() createPaymentSubDto: CreatePaymentSubDto) {
    return this.paymentService.updateSubscription(createPaymentSubDto);
  }

  @Get('/cancelSubscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  cancelSubscription(@GetUser() user: User) {
    return this.paymentService.cancelSubscription(user);
  }

  @Get('/stripe_connect')
  connectWithStripe(@Query() query, @Res() res) {
    return this.paymentService.connectWithStripe(query, res);
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Get('/userSubData')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  fetchUserSubData(@GetUser() user: User) {
    return this.paymentService.fetchUserSubData(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentService.remove(+id);
  }

  @Post('/turnover')
  fetchTurnover(@Body() turnoverByProDto: turnoverByProDto) {
    return this.paymentService.fetchTurnover(turnoverByProDto);
  }

  @Post('/fetchTotalPayements')
  async fetchTotalPayements(@Body() turnoverByProDto: turnoverByProDto) {
    return await this.paymentService.fetchTotalPayements(turnoverByProDto);
  }

  @Post('/createCoupon')
  async createCoupons(@Body() createCouponDto: createCouponDto) {
    return this.paymentService.createCoupns(createCouponDto);
  }

  @Post('/getAllDiscounts')
  getAllDiscounts(@Body() fetchDiscounts: FetchDiscounts) {
    return this.paymentService.getAllDiscounts(fetchDiscounts);
  }

  @Post('/deleteCoupon')
  deleteCoupon(@Body() createCouponDto: createCouponDto) {
    return this.paymentService.deleteCoupon(createCouponDto);
  }

  @Post('/updateCoupon')
  updateCoupon(@Body() createCouponDto: createCouponDto) {
    return this.paymentService.updateCoupon(createCouponDto);
  }

  @Post('/subscriptionPayment')
  subscriptionPayment(@Body() fetchDiscounts: FetchDiscounts) {
    return this.paymentService.subscriptionPayment(fetchDiscounts);
  }

  @Post('/eventPackPayment')
  eventPackPayment(@Body() fetchDiscounts: FetchDiscounts) {
    return this.paymentService.eventPackPayment(fetchDiscounts);
  }

  @Post('/appointmentPayment')
  appointmentPayment(@Body() fetchDiscounts: FetchDiscounts) {
    return this.paymentService.appointmentPayment(fetchDiscounts);
  }

  @Post('/eventPayment')
  eventPayment(@Body() fetchDiscounts: FetchDiscounts) {
    return this.paymentService.eventPayment(fetchDiscounts);
  }
}