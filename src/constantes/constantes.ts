import { NotificationMessagePayload } from 'firebase-admin/lib/messaging/messaging-api';
import { notifTag, subScriptioName } from 'src/shared/enums';

export const SUCCEEDED = 'succeeded_action';
export const SOMETHING_WENT_WRONG = 'something_went_wrong!';
export const ALREADY_EXIST = 'already_exist';
export const ALREADY_EXIST_APPOINTMENT = 'API.ALREADY_BOOKED';
//
export const USER_CREATED = 'user_created';
export const LOGIN_SUCCEEDED = 'login_succeeded';
export const INVALID_CREDENTIALS = 'invalid_credentials';
export const INVALID_TOKEN_CREDENTIALS = 'invalid_token_credentials';
export const INVALID_SIRET_CODE = 'invalid_SIRET_code';
export const VALID_SIRET_CODE = 'valid_SIRE_code';
export const INVALID_REFRRELCODE = 'invalid_referrel_code';
export const SOME_CREDENTIALS_INVALID = 'some_credentials_are_invalid';
export const INVALID_EMAIL = 'invalid_email';
export const EMAIL_PASS_INVALID = 'invalid_password_or_email';
export const PLEASE_ACTIVETE = 'Please_activate_your_account';
export const PAYMENT_REQUIRED = 'payment_required';
//
export const ROLES_KEY = 'roles';
export const PERMISSION_KEY = 'permissions';
export const APP_GUARD = 'app_guard';
export const MAIL_SENT = 'mail_sent';

export const LOG = 'log';
export const ERROR = 'error';
export const DEGUG = 'debug';
export const VERBOSE = 'verbose';
export const WARN = 'warn';

export const ADDETIONAL_EVENT = 10;
export const PAGE_SIZE = 9;
export const DEVICE_TOKEN_TEST =
  'cSx97de0fFbV4eS5khUA2j:APA91bHi7F1ml01K5W3MZF3_eChZSfiIHavryGrDI78Avu8djtZ_-iVDKN3lhxQEoLex2J0lyzvzR7JyAm6-OEQghh0AAouGAjAgvkxu6acbchTRHg16ZnBbhPV2v-15xbVcoU4iBIRt';
export const title = 'beYANG';
export const icon = '';
export const icon2 =
  'https://beyang.s3.eu-central-1.amazonaws.com/favicon+beyang+(6).svg';
export const QUOTATION_DEMANDE_FOR_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.QUOTATION_DEMANDE_FOR_PRO,
});
export const QUOTATION_ACCEPTED_FOR_CLIENT = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.QUOTATION_ACCEPTED_FOR_CLIENT,
});

export const QUOTATION_ACCEPTED_FOR_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.QUOTATION_ACCEPTED_FOR_PRO,
});

export const APPOINTEMNT_DEMANDE_FOR_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.APPOINTEMNT_DEMANDE_FOR_PRO,
});

export const APPOINTEMNT_DEMANDE_FOR_EMPLOYEE = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.APPOINTEMNT_DEMANDE_FOR_EMPLOYEE,
});

export const POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
});
//
//

export const CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
});

//
//
//
//
//

export const CANCLED_APPOINTEMENT_FOR_C = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.CANCLED_APPOINTEMENT_FOR_C,
});
export const CANCLED_APPOINTEMENT_FOR_P = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.CANCLED_APPOINTEMENT_FOR_P,
});
export const CANCLED_APPOINTEMENT_FOR_EMP = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.CANCLED_APPOINTEMENT_FOR_EMP,
});
export const ACCEPTED_APPOINTEMENT_FOR_C = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.ACCEPTED_APPOINTEMENT_FOR_C,
});

export const REFUSED_APPOINTEMENT_FOR_E = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.REFUSED_APPOINTEMENT_FOR_EMP,
});

export const REFUSED_APPOINTEMENT_FOR_P = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.REFUSED_APPOINTEMENT_FOR_P,
});
export const REFUSED_APPOINTEMENT_FOR_C = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.REFUSED_APPOINTEMENT_FOR_C,
});

export const POSTPOINTED_APPOINTEMENT_FOR_EMP = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.POSTPOINTED_APPOINTEMENT_FOR_P,
});

export const APPOINTMENT_FINISHED_FOR_CLIENT = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.APPOINTMENT_FINISHED_FOR_CLIENT,
});

export const APPOINTMENT_FINISHED_FOR_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.APPOINTMENT_FINISHED_FOR_PRO,
});

export const APPOINTMENT_FINISHED_FOR_EMP = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.APPOINTMENT_FINISHED_FOR_EMP,
});

export const POSTPOINTED_APPOINTEMENT_FOR_P = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.POSTPOINTED_APPOINTEMENT_FOR_P,
});
export const POSTPOINTED_APPOINTEMENT_FOR_C = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.POSTPOINTED_APPOINTEMENT_FOR_C,
});
//
//
//
//
//
export const RATING_FROM = (badge?: string): NotificationMessagePayload => ({
  tag: notifTag.RATING,
  badge,
});

//
//

export const UNAVAILABLE_EMPLOYEE = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.UNAVAILABLE_EMPLOYEE,
});
export const CANCELED_EVENT = (badge?: string): NotificationMessagePayload => ({
  badge,
  tag: notifTag.CANCELED_EVENT,
});

export const NEW_SIGNUP_EVENT = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.NEW_SIGNUP_EVENT,
});

export const NEW_PRIVAT_EVENT_INVITATION = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.NEW_PRIVAT_EVENT_INVITATION,
});


export const _app_fri_mon= (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: '_app_fri_mon',
});

export const _sub_2= (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: '_sub_2',
});

export const _sub_14= (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: '_sub_14',
});

export const _EVENT_26= (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: '_EVENT_26',
});

export const _EVENT_15= (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: '_EVENT_15',
});


export const _app_26= (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: '_app_26',
});
export const _app_15= (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: '_app_15',
});

export const SUBSECRITION_WILL_EXPIRED_SOON = (badge?: string) => ({
  badge,
  tag: notifTag.SUBSECRITION_WILL_EXPIRED_SOON,
});
//
//
export const SIGNUP_VIA_REFFERAL_CODE = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.SIGNUP_VIA_REFFERAL_CODE,
});
export const SIGNUP_VIA_REFFERAL_CODE_CLIENT_TO_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.SIGNUP_VIA_REFFERAL_CODE,
});

export const SIGNUP_VIA_REFFERAL_CODE_PRO_TO_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  title,
  tag: notifTag.SIGNUP_VIA_REFFERAL_CODE_PRO_TO_PRO,
  badge,
});
export const SIGNUP_VIA_REFFERAL_CODE_EMP_TO_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.SIGNUP_VIA_REFFERAL_CODE_EMP_TO_PRO,
});
//
//
//
export const NO_SHOW_REQUEST = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.NO_SHOW_REQUEST,
});
export const NO_SHOW_PASS = (badge?: string): NotificationMessagePayload => ({
  badge,
  tag: notifTag.NO_SHOW_PASS,
});
export const SOMEONE_SHARED_YOUR_PROFILE_TO_PRO = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.SOMEONE_SHARED_YOUR_PROFILE_TO_PRO,
});

export const SOMEONE_SHARED_YOUR_PROFILE_TO_CLIENT = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.SOMEONE_SHARED_YOUR_PROFILE_TO_CLIENT,
});

export const EMPLOYEE_BACK_TO_BE_ACTIVE = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.EMPLOYEE_BACK_TO_BE_ACTIVE,
});
export const PUBLIC_PRO_SIGNED_UP = (
  badge?: string,
): NotificationMessagePayload => ({
  badge,
  tag: notifTag.PUBLIC_PRO_SIGNED_UP,
});

export const NOTIFY_USERS_BACKOFFICE = (
  body: string,
  badge?: string,
): NotificationMessagePayload => (
  console.log('bodybodybodybodybodybodybodybodybodybodybodybodybody', body),
  {
    title,
    body: body,
    icon,
    badge,
    tag: notifTag.NOTIFY_USERS_BACKOFFICE,
  }
);

export const EXPIRED_SUB = (badge?: string): NotificationMessagePayload => ({
  badge,
  tag: notifTag.EXPIRED_SUB,
});

export const t_pc_notif_posp_or_dec_appointment = [
  notifTag.POSTPOINTED_APPOINTEMENT_FOR_P,
  notifTag.CANCLED_APPOINTEMENT_FOR_P,
  notifTag.POSTPOINTED_APPOINTEMENT_FOR_C,
  notifTag.CANCLED_APPOINTEMENT_FOR_C,
  notifTag.REFUSED_APPOINTEMENT_FOR_C,
  notifTag.REFUSED_APPOINTEMENT_FOR_P,
];
export const t_p_notif_new_event_signup = [notifTag.NEW_SIGNUP_EVENT];
export const t_a_notif_new_rating = [notifTag.RATING];

export const t_ep_notif_ask_for_demande = [
  notifTag.QUOTATION_DEMANDE_FOR_PRO,
  notifTag.APPOINTEMNT_DEMANDE_FOR_PRO,
  notifTag.APPOINTEMNT_DEMANDE_FOR_EMPLOYEE,
];
//
export const t_c_notif_for_appointemnt_accepted = [
  notifTag.ACCEPTED_APPOINTEMENT_FOR_C,
];

export const t_a_notif_prestation_finished = [
  notifTag.APPOINTMENT_FINISHED_FOR_CLIENT,
  notifTag.APPOINTMENT_FINISHED_FOR_EMP,
  notifTag.APPOINTMENT_FINISHED_FOR_PRO,
];
export const tags = [
  notifTag.QUOTATION_DEMANDE_FOR_PRO,

  notifTag.APPOINTEMNT_DEMANDE_FOR_PRO,
  notifTag.APPOINTEMNT_DEMANDE_FOR_EMPLOYEE,
  notifTag.NEW_SIGNUP_EVENT,

  notifTag.RATING,
  notifTag.APPOINTMENT_FINISHED_FOR_CLIENT,
  notifTag.APPOINTMENT_FINISHED_FOR_EMP,
  notifTag.APPOINTMENT_FINISHED_FOR_PRO,
  notifTag.POSTPOINTED_APPOINTEMENT_FOR_P,
  notifTag.POSTPOINTED_APPOINTEMENT_FOR_C,

  notifTag.ACCEPTED_APPOINTEMENT_FOR_C,

  notifTag.CANCLED_APPOINTEMENT_FOR_C,
  notifTag.CANCLED_APPOINTEMENT_FOR_P,
  notifTag.REFUSED_APPOINTEMENT_FOR_C,
];

export const SUBSECRIPTION_PAYMENT_CONDITION = [
  {
    subscription_expiration_date: {
      $gte: new Date(Date.now()),
    },
  },
  { active: true },
  { checkPayment: true },
];

export const SUBSECRIPTION_PAYMENT_CONDITION_FROM_COMPANY = [
  {
    'reletedTo.subscription_expiration_date': {
      $gte: new Date(Date.now()),
    },
  },
  { 'reletedTo.checkPayment': true },
  { 'reletedTo.active': true },
];

export const SUBSCRIPTION_CHECK = [
  {
    $lookup: {
      from: 'subscriptions',
      localField: 'subscription',
      foreignField: '_id',
      as: 'subscription',
    },
  },
  { $unwind: '$subscription' },
  {
    $addFields: {
      checkPayment: {
        $cond: [
          {
            $eq: ['$subscription.monthly_payment', 0],
          },
          {
            $cond: [{ $lt: ['$total_appointments', 3] }, true, false],
          },
          true,
        ],
      },
    },
  },
];
export const SUBSCRIPTION_CHECK_FROM_COMPANY = [
  {
    $lookup: {
      from: 'subscriptions',
      localField: 'reletedTo.subscription',
      foreignField: '_id',
      as: 'reletedTo.subscription',
    },
  },
  { $unwind: '$reletedTo.subscription' },
  {
    $addFields: {
      checkPayment: {
        $cond: [
          {
            $eq: ['$subscription.monthly_payment', 0],
          },
          {
            $cond: [{ $lt: ['$reletedTo.total_appointments', 3] }, true, false],
          },
          true,
        ],
      },
    },
  },
];
