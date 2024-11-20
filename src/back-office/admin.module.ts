import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from 'src/api/users/users.module';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { CategoryModule } from 'src/api/category/category.module';
import { PaymentModule } from 'src/api/payment/payment.module';
import { MailModule } from 'src/mailling/mail.module';
import { AuthModule } from 'src/api/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsPack, EventsPackSchema } from 'src/api/eventspack/schemas/eventspack.entity';


@Module({
  imports: [
    forwardRef(() => AuthModule),
    UsersModule,
    MailModule,
    PaymentModule,
    mongooseModuleConfig,
    CategoryModule,
    MongooseModule.forFeature([
      { name: EventsPack.name, schema: EventsPackSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
