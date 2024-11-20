import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationService } from 'src/api/notifications/notification.service';
import { User } from 'src/api/users/models/user.model';
import { EXPIRED_SUB } from 'src/constantes/constantes';
import { notifTag } from 'src/shared/enums';
import {
  dataPayload,
  NotificationMessage,
  onNotify,
} from 'src/shared/notif.class';

@Injectable()
export class SubscriptionGuardPermission implements CanActivate {
  constructor(
    private readonly notificationService: NotificationService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const user_data = await this.userModel.findOne({ _id: user._id });
    if (user_data?.subscription_expiration_date < new Date()) {
      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.EXPIRED_SUB,
          firstName: user_data.firstName,
          lastName: user_data.lastName,
          companyName: user_data.companyName,
          start_date: user_data?.subscription_expiration_date.toISOString(),
          badge: await this.notificationService.badge(user_data._id),
        }),
        notification: EXPIRED_SUB(
          await this.notificationService.badge(user_data._id),
        ),
      };

      await onNotify(null, user_data, this.notificationService, message);

      return true;
    }
    return true;
  }
}
