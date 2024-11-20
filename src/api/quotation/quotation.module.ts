/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { AppointmentModule } from '../appointment/appointment.module';
import { NotificationModule } from '../notifications/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';

@Module({
  imports: [
    mongooseModuleConfig,
    AppointmentModule,
    PaymentModule,
    NotificationModule,
  ],
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
