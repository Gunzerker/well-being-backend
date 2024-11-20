import {
  DataMessagePayload,
  MessagingOptions,
  NotificationMessagePayload,
} from 'firebase-admin/lib/messaging/messaging-api';
import passport from 'passport';
import { NotificationService } from 'src/api/notifications/notification.service';
import { User } from 'src/api/users/models/user.model';
import {
  DEVICE_TOKEN_TEST,
  tags,
  t_a_notif_new_rating,
  t_a_notif_prestation_finished,
  t_c_notif_for_appointemnt_accepted,
  t_ep_notif_ask_for_demande,
  t_pc_notif_posp_or_dec_appointment,
  t_p_notif_new_event_signup,
} from 'src/constantes/constantes';
import { notifTag, privilege } from './enums';

export class NotificationMessage {
  data?: DataMessagePayload;
  notification?: NotificationMessagePayload;
}
export const canPass = (tag: string, user: User) => {
  let can = false;
  switch (user.type) {
    case privilege.PRO: {
      const {
        ep_notif_ask_for_demande,
        a_notif_new_rating,
        a_notif_prestation_finished,
        p_notif_new_event_signup,
        pc_notif_posp_or_dec_appointment,
      } = user;
      if (
        a_notif_prestation_finished == true &&
        t_a_notif_prestation_finished[2] == tag
      ) {
        can = true;
      }

      if (
        ep_notif_ask_for_demande == true &&
        (t_ep_notif_ask_for_demande[0] == tag ||
          t_ep_notif_ask_for_demande[1] == tag)
      ) {
        can = true;
      }
      if (a_notif_new_rating == true && t_a_notif_new_rating[0] == tag) {
        can = true;
      }
      if (
        p_notif_new_event_signup == true &&
        t_p_notif_new_event_signup[0] == tag
      ) {
        can = true;
      }

      if (
        pc_notif_posp_or_dec_appointment == true &&
        (t_pc_notif_posp_or_dec_appointment[0] == tag ||
          t_pc_notif_posp_or_dec_appointment[1] == tag ||
          t_pc_notif_posp_or_dec_appointment[2] == tag ||
          t_pc_notif_posp_or_dec_appointment[3] == tag)
      ) {
        can = true;
      }
      //
      //
      //
      //
      //
      //
      //
      //
      //
    }
    case privilege.CLIENT: {
      const {
        c_notif_for_appointemnt_accepted,
        a_notif_new_rating,
        a_notif_prestation_finished,
        pc_notif_posp_or_dec_appointment,
      } = user;
      if (
        a_notif_prestation_finished == true &&
        t_a_notif_prestation_finished[0] == tag
      ) {
        can = true;
      }

      if (
        c_notif_for_appointemnt_accepted == true &&
        t_c_notif_for_appointemnt_accepted[0] == tag
      ) {
        can = true;
      }
      //
      if (a_notif_new_rating == true && t_a_notif_new_rating[0] == tag) {
        can = true;
      }
      //
      if (
        pc_notif_posp_or_dec_appointment == true &&
        (t_pc_notif_posp_or_dec_appointment[2] == tag ||
          t_pc_notif_posp_or_dec_appointment[3] == tag ||
          t_pc_notif_posp_or_dec_appointment[4] == tag)
      ) {
        can = true;
      }
      //

      //
      //
      //
      //
      //
      //
    }
    case privilege.EMPLOYEE: {
      const {
        ep_notif_ask_for_demande,
        a_notif_new_rating,
        a_notif_prestation_finished,
      } = user;

      if (
        ep_notif_ask_for_demande == true &&
        t_ep_notif_ask_for_demande[2] == tag
      ) {
        can = true;
      }
      if (
        a_notif_prestation_finished == true &&
        t_a_notif_prestation_finished[1] == tag
      ) {
        can = true;
      }

      if (a_notif_new_rating == true && t_a_notif_new_rating[0] == tag) {
        can = true;
      }
    }
  }
  return can;
};

export const onNotify = async (
  from: User,
  to: User,
  notificationService: NotificationService,
  message: NotificationMessage,
  needCrone?:boolean
) => {
  try {
     message["data"]["userLocale"]=to?.userLocale?to?.userLocale:"fr"
    if (needCrone) {
      needCrone=true
    } else {
      needCrone==false
    }
    
    if (!needCrone) {
      const Pusher = require('pusher');
      const pusher = new Pusher({
        appId: process.env.pusher_appId,
        key: process.env.pusher_key,
        secret: process.env.pusher_secret,
        cluster: process.env.pusher_cluster,
        useTLS: process.env.pusher_userTLS,
      });
   
      const eventWasSent = await pusher.trigger(
        to._id.toString(),
        'newNotifReceived',
        {
          message: 'new Notification send',
        },
      );
  
      console.log('************ new Notification send *************', eventWasSent);  
    }
    

    if (to.platform == null && needCrone == true) {
      console.log('not passe ! ');
      return false
    }
    message.data["type"] = to.type
    if (!from) {
      console.log(
        'from : ',
        { email: 'admin', firstName: 'admin' },
        '==>to : ',
        { email: to.email, firstName: to.firstName },
        'device token : ',
        to.notificationDeviceToken,
      );
    } else {
      console.log(
        'from : ',
        { email: from.email, firstName: from.firstName },
        '==>to : ',
        { email: to.email, firstName: to.firstName },
        'device token : ',
        to.notificationDeviceToken,
      );
    }

    let options: MessagingOptions;
    if (!to["platform"])
      options = {
        // timeToLive: 60 * 60 * 24,
        notification: { title: 'digitu', body: 'feechr' },
        data: null,
        apns: {
          payload: {
            aps: {
              'mutable-content': 1,
            },
          },
        },
        token: null,
      };
    else
      options = {
        priority: 'high',
        // timeToLive: 60 * 60 * 24,
        content_available: true,
        apns: {
          payload: {
            headers: {
              'apns-push-type': 'background',
              'apns-priority': '10',
              'apns-expiration': '1604750400',
              aps: {},
            },
          },
        }
      }

    //!to contunite
    let notifCanPass = false;
    const check = tags.includes(message.data.tag as notifTag);
    if (check == true) {
      console.log('with filter');

      notifCanPass = canPass(message.data.tag, to);
      if (notifCanPass) {
        if ((!to.notificationDeviceToken || to.notificationDeviceToken.length <= 0) && !needCrone) {
          console.log('no device token at this user');
          await notificationService.notifTriggerOn({
            from: from ? from._id : null,
            to: to._id,
            data: message.data,
            content:
              message.notification.body != null ? message.notification.body : null,
          });
        } else {
          notificationService.sendNotificationTo(
            message,
            to.notificationDeviceToken[0],
            options,
          );

          // if (send) {
            if (needCrone==true) {
              console.log('not passe db ! ');
              return false
            } else {
              await notificationService.notifTriggerOn({
                from: from._id,
                to: to._id,
                data: message.data,
                content:
                  message.notification.body != null
                    ? message.notification.body
                    : null,
              }); 
              console.log('added to bd', {
                from: from._id,
                to: to._id,
                data: message.data,
                content:
                  message.notification.body != null
                    ? message.notification.body
                    : null,
              });
            }
         

         

          console.log({
            oNotify: true,
            from: from ? from.firstName : 'admin',
            to: to.firstName,
          });
          // } else {
          //   console.log('notification did not send and did not added to db');
          // }
        }
      } else {
        console.log('blocked from configurations');
      }
    } else {
      console.log('witout filter');

      if ((!to.notificationDeviceToken || to.notificationDeviceToken.length <= 0) && !needCrone) {
        console.log('this user dont have devicetoken');
        await notificationService.notifTriggerOn({
          from: from ? from._id : null,
          to: to._id,
          data: message.data,
          content:
            message.notification.body != null ? message.notification.body : null,
        });
      } else {
        const send = await notificationService.sendNotificationTo(
          message,
          to.notificationDeviceToken[0],
          options,
        );
        console.log('send : ', send);

        // if (send == true) {
          if (needCrone==true) {
            console.log('not passe db !! ');
            return false
          } else {
            await notificationService.notifTriggerOn({
              from: from ? from._id : null,
              to: to._id,
              data: message.data,
              content:
                message.notification.body != null
                  ? message.notification.body
                  : null,
            });

            console.log('added to bd', {
              from: from ? from._id : null,
              to: to._id,
              data: message.data,
              content:
                message.notification.body != null
                  ? message.notification.body
                  : null,
            });
          }
        
       
        console.log({
          oNotify: true,
          from: from ? from.firstName : 'admin',
          to: to.firstName,
        });
        // } else {
        //   console.log('notification did not send and did not added to db');
        // }
      }
    }
  } catch (e) {
    console.log(" ***** error in on notif *****");
    console.log(e);
    
  }
};

export const dataPayloadToAdmin = (
  userId: string,
  firstName: string,
  lastName: string,
  profileImage: string,
  tag: string,
) => {
  return {
    userId: userId ? userId.toString() : '',
    firstName: firstName ? firstName : '',
    lastName: lastName ? lastName : '',
    profileImage: profileImage ? profileImage : '',
    tag: tag ? tag : '',
    toAdmin: 'true',
  };
};

export const dataPayload = (payload: {
  tag: string;
  content?: string;
  badge?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  start_date?: string;
  new_date?: string;
  num_quo?: string;
  eventName?: string;
  eventId?: string;
  isViseo?: string;
  appointmentId?: string;
  url?: string;
  userLocale?:string
}) => {
  return {
    firstName: payload.firstName ? payload.firstName : '',
    lastName: payload.lastName ? payload.lastName : '',
    companyName: payload.companyName ? payload.companyName : '',
    start_date: payload.start_date ? payload.start_date : '',
    new_date: payload.new_date ? payload.new_date : '',
    appointmentId: payload.appointmentId
      ? payload.appointmentId.toString()
      : '',
    quo_num: payload.num_quo ? payload.num_quo : '',
    eventName: payload.eventName ? payload.eventName : '',
    eventId: payload.eventId ? payload.eventId.toString() : '',
    isViseo: payload.isViseo ? payload.isViseo : '',
    tag: payload.tag ? payload.tag : '',
    badge: payload.badge ? payload.badge : '',
    url: payload.url ? payload.url : '',
    click_action: 'FLUTTER_NOTIFICATION_CLICK',
    content: payload.content ? payload.content : '',
  };
};