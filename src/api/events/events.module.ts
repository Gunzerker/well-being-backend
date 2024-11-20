import { forwardRef, Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Events, EventsSchema, TheNext, TheNextSchema } from './schemas/event.entity';
import { UsersModule } from '../users/users.module';
import {
  EventsMembers,
  EventsMembersSchema,
} from './schemas/eventMembers.entity';
import { User, UserSchema } from '../users/models/user.model';
import { PaymentModule } from '../payment/payment.module';
import { FilesS3Service } from '../auth/s3.service';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notifications/notification.module';
import { ScheduleModule } from '@nestjs/schedule/dist';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: Events.name, schema: EventsSchema }]),
    MongooseModule.forFeature([{ name: TheNext.name, schema: TheNextSchema }]),
    MongooseModule.forFeature([
      { name: EventsMembers.name, schema: EventsMembersSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PaymentModule,
    forwardRef(() => UsersModule),
    EventsModule,
    WalletModule,
    NotificationModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, FilesS3Service],
  exports: [EventsService],
})
export class EventsModule {}
