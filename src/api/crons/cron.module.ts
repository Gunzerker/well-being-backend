import { CronService } from './cron.service';
import { CronController } from './cron.controller';
/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule/dist';
import { AppointmentModule } from '../appointment/appointment.module';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { TheNext, TheNextSchema } from '../events/schemas/event.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([{ name: TheNext.name, schema: TheNextSchema }]),
    ScheduleModule.forRoot(),
  ],
  controllers: [CronController],
  providers: [CronService],
})
export class CronModule {}
