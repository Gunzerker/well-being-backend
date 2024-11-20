import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as moment from 'moment';
import { Coupon } from 'src/api/payment/schemas/coupons.entity';
import { Payment } from 'src/api/payment/schemas/payment.entity';
import { User } from 'src/api/users/models/user.model';

@Injectable()
export class CouponValidatorPipe implements PipeTransform {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    if (value.coupon) {
      const coupon_data = await this.couponModel.findOne({
        code: value.coupon,
        expires_at: { $gte: new Date().toISOString() },
        /* check difference between times */
      });
      /* fetch user data */
      const user_data = await this.userModel.findOne({_id:value.userId})
      if(!coupon_data)
      throw new HttpException(
        { status: 4001, message: 'API.INVALID_COUPON' },
        HttpStatus.BAD_REQUEST,
      );
      if (
        coupon_data['subscriptions'].length != 0 &&
        coupon_data['subscriptions'].includes(value.subId) == false
      )
        throw new HttpException(
          { status: 4002, message: 'API.INVALID_COUPON_FOR_THIS_SUB' },
          HttpStatus.BAD_REQUEST,
        );
      if (
        coupon_data['to'].length != 0 &&
        coupon_data['to'].includes(user_data.email) == false
      ) {
        throw new HttpException(
          { status: 4003, message: 'API.INVALID_COUPON_FOR_THIS_USER' },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (coupon_data['duration'] != value.type) {
        throw new HttpException(
          { status: 4004, message: 'API.INVALID_COUPON_EXPIRED' },
          HttpStatus.BAD_REQUEST,
        );
      }
      /* check if coupon already user by the user */
      const checkPayment = await this.paymentModel.findOne({
        from: value.userId,
        coupon: value.coupon,
        type: 'Subscription',
        status: 'Success',
      });
      if (checkPayment)
        throw new HttpException(
          { status: 4005, message: 'API.INVALID_COUPON_ALREADY_USED' },
          HttpStatus.BAD_REQUEST,
        );
    }
    return value;
  }
}
