/*
https://docs.nestjs.com/modules
*/

import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { Jwtconfiguration } from '../../shared/jwtConfig';

import { MailService } from 'src/mailling/mail.service';
import { MailModule } from 'src/mailling/mail.module';
import { HttpModule } from '@nestjs/axios';

import { AdminModule } from 'src/back-office/admin.module';

import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { CategoryModule } from '../category/category.module';
import { PaymentModule } from '../payment/payment.module';
import { CompanyModule } from '../companies/company.module';
import { MulterModule } from '@nestjs/platform-express';
import { FilesS3Service } from './s3.service';
import { PrestationModule } from '../prestation/prestation.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notifications/notification.module';
@Module({
  imports: [
    forwardRef(() => AdminModule),
    UsersModule,
    MailModule,
    PaymentModule,
    PassportModule,
    mongooseModuleConfig,
    Jwtconfiguration,
    HttpModule,
    CategoryModule,
    CompanyModule,
    WalletModule,
    MulterModule,
    PrestationModule,
    NotificationModule,
  ],
  providers: [AuthService, MailService, JwtStrategy, FilesS3Service],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
