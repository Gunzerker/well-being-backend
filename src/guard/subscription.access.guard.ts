import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/api/users/models/user.model';


@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const user_data = await this.userModel
      .findOne({ _id: user._id })
      .populate('subscription');
    if (user_data?.subscription_expiration_date < new Date())
      return false;
    return true;
  }
}
