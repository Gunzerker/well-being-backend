import * as firebase from 'firebase-admin';
import { Exceptionlookup } from 'src/shared/handling.error.message';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../../config/env/firebase.json';
import { ServiceAccount } from 'firebase-admin';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDto } from './models/notification.model';
import { SOMETHING_WENT_WRONG, SUCCEEDED } from 'src/constantes/constantes';
import { MessagingOptions } from 'firebase-admin/lib/messaging/messaging-api';
import { NotificationMessage } from 'src/shared/notif.class';
import { UserToken } from 'src/shared/tokenModel';
import { notifStatus } from 'src/shared/enums';
import { apiReturner } from 'src/shared/returnerApi';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User } from '../users/models/user.model';
import { query } from 'express';
@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notifModel: Model<Notification>,
    @InjectModel(User.name) private userModelForNotif: Model<User>,
  ) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });
  }

  public async notifTriggerOn(notification: NotificationDto): Promise<boolean> {
    const added = await this.notifModel.create({ ...notification });
    return added ? true : false;
  }

  public async sendNotificationTo(
    message: NotificationMessage,
    notificationDeviceToken: string,
    options,
  ) {
    let canAddedTodb = true;
    try {
      if (!options.notification) {

        return await firebase
          .messaging()
          .sendToDevice(notificationDeviceToken, message, options)
          .then((response) => {
            if (response.failureCount >= 1) {
              console.log(
                ' could not sent notification',
                response.results[0].error,
              );
              canAddedTodb = false;
            }
            if (response.successCount >= 1) {
              console.log('notification sent', response);
              canAddedTodb = true;
            }
            console.log(response)
            // if (response.failureCount >= 1) {
            //   console.log(
            //     ' could not sent notification',
            //     response.results[0].error,
            //   );
            //   canAddedTodb = false;
            // }
            // if (response.successCount >= 1) {
            //   console.log('notification sent', response);
            //   canAddedTodb = true;
            // }
            // Response is a message ID string.

            return canAddedTodb;
          })
      }
      console.log("my message: ", message)
      options.token = notificationDeviceToken;
      options.notification = /*message.notification*/ { title: message.notification.tag, body: "" } //message.notification -- message.data
      options.data = message.data
      options.apns.payload.aps.badge = Number(message.notification.badge)
      options.android = { notification: { title: "Beyang", body: "" } }
      return await firebase
        .messaging()
        .send(options)
        .then((response) => {
          console.log(canAddedTodb);
          console.log(response)
          // if (response.failureCount >= 1) {
          //   console.log(
          //     ' could not sent notification',
          //     response.results[0].error,
          //   );
          //   canAddedTodb = false;
          // }
          // if (response.successCount >= 1) {
          //   console.log('notification sent', response);
          //   canAddedTodb = true;
          // }
          // Response is a message ID string.

          return canAddedTodb;
        });
    } catch (e) {
      Exceptionlookup(e);
    }
  }

  // public async sendNotification(
  //   notification: any,
  //   data: any,
  //   badge: string,
  //   notificationDeviceToken: string,
  // ) {
  //   var options = {
  //     priority: 'high',
  //     // timeToLive: 60 * 60 * 24,
  //     apns: {
  //       payload: {
  //         content_available: true,
  //         headers: {
  //           'apns-push-type': 'background',
  //           'apns-priority': '5',
  //           'apns-expiration': '1604750400',
  //         },
  //         aps: {},
  //       },
  //     },
  //   };
  //   console.log(options);
  //   let message: Message = {
  //     notification,
  //     token: notificationDeviceToken,
  //     apns: {
  //       payload: {
  //         headers: {
  //           'apns-priority': '5',
  //           'apns-expiration': '1604750400',
  //         },
  //         aps: {
  //           'mutable-content': 1,
  //           badge: Number(badge),
  //         },
  //       },
  //     },
  //     data,
  //   };
  //   try {
  //     return await firebase
  //       .messaging()
  //       .send(message)
  //       .then((response) => {
  //         // Response is a messa console.log(message);
  //         console.log(response);
  //         return true;
  //       })
  //       .catch((error) => {
  //         console.log('Error sending message:', error);
  //         return false;
  //       });
  //   } catch (e) {
  //     Exceptionlookup(e);
  //   }
  // }

  async notificationsListeService(
    me: UserToken,
    page_size: number,
    page_number: number,
  ) {
    const notiflength = await this.notifModel
      .find({ to: me._id })
      .sort({ createdAt: -1 })
      .lean()
      .count();
    const notifs = await this.notifModel
      .find({ to: me._id })
      .sort({ createdAt: -1 })
      .populate('to')
      .populate({path:'from',populate:'relatedCompany'})
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10)
      .lean();
    await this.userModelForNotif.updateOne(
      { _id: me._id },
      { badgeCounter: 0 },
    );
    return {
      statusCode: 200,
      message: 'LIST.OF.NOTIFICATIONS',
      data: notifs,
      page_number,
      page_size,
      notiflength,
    };
  }

  async notifeStatusService(me: UserToken, idNotif: string) {
    const updated = await this.notifModel.findOneAndUpdate(
      { _id: idNotif },
      { status: 'READ' },
      { new: true },
    );

    if (updated) {
      console.log('here');

      return apiReturner(HttpStatus.OK, SUCCEEDED);
    } else {
      throw new HttpException(
        SOMETHING_WENT_WRONG,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async badge(idUser: string) {
    console.log(idUser);

    const badgeNumber = (
      await this.notifModel.find({ to: idUser, status: notifStatus.UNREAD })
    ).length;
    if (!badgeNumber || badgeNumber == 0) {
      return '0';
    } else {
      return (badgeNumber + 1).toString();
    }
  }

  async notificationsListeAdminService(
    me: UserToken,
    page_size: number,
    page_number: number,
  ) {
    const notiflength = await this.notifModel
      .find({ from: null })
      .lean()
      .count();

    const notifs = await this.notifModel
      .find({ from: null, 'data.toAdmin': 'true' })
      .sort({ createdAt: -1 })
      .populate(['from', 'to'])
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10)
      .lean();

    return {
      statusCode: 200,
      message: 'LIST.OF.NOTIFICATIONS.TO.ADMIN',
      data: notifs,
      page_number: Number(page_number),
      page_size: Number(page_size),
      total_attributs: notiflength,
    };
  }

  async deleteNotification(idNotif: string) {
    const deleted = await this.notifModel.deleteOne({ _id: idNotif });
    if (deleted) {
      return true;
    } else {
      throw new HttpException(
        SOMETHING_WENT_WRONG,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchNotificationById(id) {
    return await this.notifModel
      .findOne({ _id: id })
      .populate('from')
      .populate('to');
  }

  async deleteNotifcationQuery(query) {
    await this.notifModel.deleteMany(query);
  }
  async deletNotifService(id_notif: string, me: UserToken) {
    try {
      const deleted = await this.notifModel.deleteOne({
        _id: id_notif,
        to: me._id,
      });
      if (deleted) {
        return apiReturner(HttpStatus.OK, SUCCEEDED)
      } else {
        throw new Error('not Deleted')
      }
    }
    catch (e) {
      console.log(e);
      throw new HttpException(SOMETHING_WENT_WRONG, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
