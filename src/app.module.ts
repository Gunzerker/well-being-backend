import { CronModule } from './api/crons/cron.module';
import { NotificationModule } from './api/notifications/notification.module';

import { FavouriteModule } from './api/favourite/favourite.module';
import { AdminModule } from './back-office/admin.module';
import { CompanyModule } from './api/companies/company.module';
import { MailModule } from './mailling/mail.module';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './api/auth/auth.module';
import { UsersModule } from './api/users/users.module';
import { PaymentModule } from './api/payment/payment.module';
import { CategoryModule } from './api/category/category.module';
import { PrestationModule } from './api/prestation/prestation.module';
import { AppointmentModule } from './api/appointment/appointment.module';
import { EventspackModule } from './api/eventspack/eventspack.module';
import { EventsModule } from './api/events/events.module';
import { ScheduleModule } from '@nestjs/schedule/dist/schedule.module';
import { WalletModule } from './api/wallet/wallet.module';

@Module({
  imports: [
   
    CronModule,
    NotificationModule,
    ScheduleModule.forRoot(),
    FavouriteModule,
    AdminModule,
    ConfigModule.forRoot({
      envFilePath: `src/config/env/.${process.env.NODE_ENV}.env`,
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.DB_URI, {
      dbName: process.env.DB_NAME,
    }),
    CompanyModule,
    UsersModule,
    PaymentModule,
    CategoryModule,
    AuthModule,
    PrestationModule,
    AppointmentModule,
    EventspackModule,
    EventsModule,
    FavouriteModule,
    WalletModule,
    MailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
