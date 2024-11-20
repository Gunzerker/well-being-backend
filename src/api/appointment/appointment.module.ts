import { forwardRef, Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentBusinessInstance,
  AppointmentBusinessInstanceSchema,
  AppointmentInstance,
  AppointmentInstanceSchema,
  AppointmentSchema,
} from './schemas/appointment.entity';
import { CompanyModule } from '../companies/company.module';
import { PaymentModule } from '../payment/payment.module';
import { UsersModule } from '../users/users.module';
import { PrestationModule } from '../prestation/prestation.module';
import { WalletModule } from '../wallet/wallet.module';
import {
  AppointmentStat,
  AppointmentStatSchema,
} from './schemas/appointment.stat';
import { NotificationModule } from '../notifications/notification.module';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { QuotationModule } from '../quotation/quotation.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: AppointmentStat.name, schema: AppointmentStatSchema },
    ]),
    MongooseModule.forFeature([
      { name: AppointmentInstance.name, schema: AppointmentInstanceSchema },
    ]),
    MongooseModule.forFeature([
      { name: AppointmentBusinessInstance.name, schema: AppointmentBusinessInstanceSchema },
    ]),
    mongooseModuleConfig,
    PaymentModule,
    CompanyModule,
    PrestationModule,
    WalletModule,
    forwardRef(() => UsersModule),
    forwardRef(() => QuotationModule),
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
