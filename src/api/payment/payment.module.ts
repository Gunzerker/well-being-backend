import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment, PaymentSchema } from './schemas/payment.entity';
import {
  Relationship,
  RelationshipShema,
  User,
  UserSchema,
} from '../users/models/user.model';
import {
  Appointment,
  AppointmentSchema,
  AppointmentInstance,
  AppointmentInstanceSchema,
  AppointmentBusinessInstanceSchema,
  AppointmentBusinessInstance,
} from '../appointment/schemas/appointment.entity';
import {
  Subscription,
  SubscriptionSchema,
} from '../../back-office/models/subscription.model';
import { PrestationModule } from '../prestation/prestation.module';
import { CompanyModule } from '../companies/company.module';
import {
  Prestation,
  prestationSchema,
} from '../prestation/models/prestation.model';
import { Quotation, quotationSchema } from '../quotation/model/model.quotation';
import {
  EventsPack,
  EventsPackSchema,
} from '../eventspack/schemas/eventspack.entity';
import { Events, EventsSchema, TheNext, TheNextSchema } from '../events/schemas/event.entity';
import { EventsModule } from '../events/events.module';
import {
  EventsMembers,
  EventsMembersSchema,
} from '../events/schemas/eventMembers.entity';
import { NotificationModule } from '../notifications/notification.module';
import { Coupon, CouponSchema } from './schemas/coupons.entity';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: EventsPack.name, schema: EventsPackSchema },
    ]),

    MongooseModule.forFeature([
      { name: EventsMembers.name, schema: EventsMembersSchema },
    ]),
    MongooseModule.forFeature([{ name: Events.name, schema: EventsSchema }]),
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: Prestation.name, schema: prestationSchema },
    ]),
    MongooseModule.forFeature([
      { name: Quotation.name, schema: quotationSchema },
    ]),

    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    MongooseModule.forFeature([
      { name: AppointmentInstance.name, schema: AppointmentInstanceSchema },
      { name: TheNext.name, schema: TheNextSchema }
    ]),
    MongooseModule.forFeature([
      { name: AppointmentBusinessInstance.name, schema: AppointmentBusinessInstanceSchema },
    ]),
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    MongooseModule.forFeature([
      { name: Relationship.name, schema: RelationshipShema },
    ]),
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
    ]),
    PrestationModule,
    CompanyModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
