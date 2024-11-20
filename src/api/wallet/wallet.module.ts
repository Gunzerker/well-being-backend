import { forwardRef, Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, walletSchema } from './schema/wallet.entity';
import { UsersModule } from '../users/users.module';
import { PaymentModule } from '../payment/payment.module';
import { QuotationModule } from '../quotation/quotation.module';
import { Quotation, quotationSchema } from '../quotation/model/model.quotation';
import { Appointment, AppointmentSchema } from '../appointment/schemas/appointment.entity';
import { CompanyModule } from '../companies/company.module';
import { FilesS3Service } from '../auth/s3.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: walletSchema },
      { name: Quotation.name, schema: quotationSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    forwardRef(() => UsersModule),
    PaymentModule,
    CompanyModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
