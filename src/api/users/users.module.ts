import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { forwardRef, Module } from '@nestjs/common';
import { Jwtconfiguration } from '../../shared/jwtConfig';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MailService } from 'src/mailling/mail.service';
import { MailModule } from 'src/mailling/mail.module';
import { AdminModule } from 'src/back-office/admin.module';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { CategoryModule } from '../category/category.module';
import { PaymentModule } from '../payment/payment.module';
import { CompanyModule } from '../companies/company.module';
import { FilesS3Service } from '../auth/s3.service';

import { MongooseModule } from '@nestjs/mongoose';
import {
  Pocke,
  PockeShema,
  Rating,
  RatingShema,
  Referred,
  ReferredShema,
  Relationship,
  RelationshipShema,
} from './models/user.model';
import { EventsModule } from '../events/events.module';
import { QuotationModule } from '../quotation/quotation.module';
import { FavouriteModule } from '../favourite/favourite.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    forwardRef(() => AdminModule),
    MailModule,
    NotificationModule,
    ConfigModule.forRoot(),
    Jwtconfiguration,
    mongooseModuleConfig,
    MongooseModule.forFeature([
      { name: Relationship.name, schema: RelationshipShema },
      { name: Referred.name, schema: ReferredShema },
      { name: Rating.name, schema: RatingShema },
      { name: Pocke.name, schema: PockeShema },
    ]),
    HttpModule,
    CompanyModule,
    CategoryModule,
    PaymentModule,
    QuotationModule,
    FavouriteModule,
    forwardRef(() => EventsModule),
    forwardRef(() => AppointmentModule),
    WalletModule,
  ],
  controllers: [UsersController],
  providers: [MailService, UsersService, FilesS3Service],

  exports: [UsersService],
})
export class UsersModule {}
