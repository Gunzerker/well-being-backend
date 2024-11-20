export enum privilege {
  CLIENT = 'CLIENT',
  EMPLOYEE = 'EMPLOYEE',
  PRO = 'PRO',
  ADMIN = 'ADMIN',
  EXTERNAL = 'EXTERNAL',
}

export enum subScriptioName {
  ESSENTIEL = 'Essentiel',
  START = 'Start',
  DISCOVER = 'Discover',
}

export enum permission {
  PREMIUM = 'PREMIUM',
  ESSENTIEL = 'ESSENTIEL',
  START = 'START',
  DISCOVER = 'DISCOVER',
}

export enum emailtype {
  PASS = 'PASS',
  ACC = 'ACC',
  LEADS = 'LEADS',
}

export enum geoJsonEnum {
  POINT = 'Point',
}

export enum status {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  ARCHIVED = 'archived',
}
export enum device {
  MOBILE = 'MOBILE',
  WEB = 'WEB',
}

export enum relationships {
  CLIENTSHIP = 'CLIENTSHIP',
  REFERRALSHIP = 'REFERRALSHIP',
}

export enum ratingDirection {
  ProToClient = 'PTC',
  ClientToPro = 'CTP',
  EmpToClient = 'ETC',
  ClientToEmp = 'CTE',
}

export enum uPhotos {
  BOUTIQUE = 'boutique',
  TEAM = 'team',
  PORTFOILO = 'portfolio',
}

export enum quotationsType {
  T = 'u',
  NT = 'a',
}
export enum notifStatus {
  READ = 'READ',
  UNREAD = 'UNREAD',
}

export enum appointStatus {
  POSTPOINED_APPOINTEMENT = 'postponed',
  CANCLED_APPOINTEMENT = 'cancled',
}

export enum notifTag {
  //appointment
  APPOINTEMNT_DEMANDE_FOR_PRO = 'APP_DEM_PRO',
  APPOINTEMNT_DEMANDE_FOR_EMPLOYEE = 'APP_DEM_EMPLOYEE',
  POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES = 'POSTP_APP_RUNOVR_LIMT_3W',
  CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES = 'CANCLD_APP_RUNOVR_LIMT_3W',
  //

  APPOINTMENT_FINISHED_FOR_CLIENT = 'APP_FINISH_FC',
  APPOINTMENT_FINISHED_FOR_PRO = 'APP_FINISH_FP',
  APPOINTMENT_FINISHED_FOR_EMP = 'APP_FINISH_FE',
  CANCLED_APPOINTEMENT_FOR_C = 'CANCLD_APP_FC',
  ACCEPTED_APPOINTEMENT_FOR_C = 'ACC_APP_FC',
  REFUSED_APPOINTEMENT_FOR_C = 'REFUSD_APP_FC',
  POSTPOINTED_APPOINTEMENT_FOR_C = 'POSP_APP_FC',
  //
  CANCLED_APPOINTEMENT_FOR_P = 'CANCLD_APP_FP',
  REFUSED_APPOINTEMENT_FOR_P = 'REFUSD_APP_FP',
  POSTPOINTED_APPOINTEMENT_FOR_P = 'POSP_APP_FP',

  CANCLED_APPOINTEMENT_FOR_EMP = 'CANCLD_APP_FE',
  REFUSED_APPOINTEMENT_FOR_EMP = 'REFUSD_APP_FE',
  POSTPOINTED_APPOINTEMENT_FOR_EMP = 'POSP_APP_FE',
  //devis
  QUOTATION_DEMANDE_FOR_PRO = 'QUOT_DEM_PRO',
  QUOTATION_ACCEPTED_FOR_CLIENT = 'QUOT_ACC_CLT',
  //!
  QUOTATION_ACCEPTED_FOR_PRO = 'QUOT_ACC_FR_PRO',
  //rating
  RATING = 'RATING',

  //USERS
  NOTIFY_USERS_BACKOFFICE = 'NOTIFY_USERS_BACKOFFICE',

  //dipo
  UNAVAILABLE_EMPLOYEE = 'UNAVAI_EMP',
  //event
  NEW_SIGNUP_EVENT = 'NEW_SIGNUP_EVT',
  CANCELED_EVENT = 'CANLD_EVT',
  //!
  NEW_PRIVAT_EVENT_INVITATION = 'NEW_PT_EVT_INV',

  //subscription
  SUBSECRITION_WILL_EXPIRED_SOON = 'SUBS_EXPRD_SOON',
  //parinage
  SIGNUP_VIA_REFFERAL_CODE = 'SIGNUP_VIA_RFF_CODE',
  SIGNUP_VIA_REFFERAL_CODE_CLIENT_TO_PRO = 'SIGNUP_V_REF_CODE_C_T_P',
  SIGNUP_VIA_REFFERAL_CODE_PRO_TO_PRO = 'SIGNUP_V_REF_CODE_P_T_P',
  SIGNUP_VIA_REFFERAL_CODE_EMP_TO_PRO = 'SIGNUP_V_REF_CODE_E_P',
  //leads
  //other
  EXPIRED_SUB = 'EXPIRED_SUB',
  EMPLOYEE_BACK_TO_BE_ACTIVE = 'EMP_BK_TB_ACT',
  PUBLIC_PRO_SIGNED_UP = 'P_PRO_SIGNED_UP',
  NO_SHOW_PASS = 'NS_PSS',
  SOMEONE_SHARED_YOUR_PROFILE_TO_CLIENT = 'SE_SHRD_YR_P_T_CT',
  SOMEONE_SHARED_YOUR_PROFILE_TO_PRO = 'SE_SHRD_YR_P_T_P',
  SHARE_ACCEPTED = 'SE_SHRD_ACC',
  SHARE_REFUSED = 'SE_SHRD_REF',
  NO_SHOW_REQUEST = 'NO_SHOW_REQ',
}
