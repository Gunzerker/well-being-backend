import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {
  referralCodeSenderDto,
  RegisterUserByAdminDto,
  RegisterUserDto,
} from '../auth/dto/createUserDto';

import * as bcrypt from 'bcrypt';
import { apiReturner } from 'src/shared/returnerApi';
import {
  ADDETIONAL_EVENT,
  ALREADY_EXIST,
  INVALID_CREDENTIALS,
  INVALID_EMAIL,
  INVALID_SIRET_CODE,
  NOTIFY_USERS_BACKOFFICE,
  PAGE_SIZE,
  PUBLIC_PRO_SIGNED_UP,
  QUOTATION_DEMANDE_FOR_PRO,
  RATING_FROM,
  SIGNUP_VIA_REFFERAL_CODE,
  SIGNUP_VIA_REFFERAL_CODE_EMP_TO_PRO,
  SIGNUP_VIA_REFFERAL_CODE_PRO_TO_PRO,
  SOMEONE_SHARED_YOUR_PROFILE_TO_CLIENT,
  SOMEONE_SHARED_YOUR_PROFILE_TO_PRO,
  SOMETHING_WENT_WRONG,
  SUBSECRIPTION_PAYMENT_CONDITION,
  SUCCEEDED,
  USER_CREATED,
  VALID_SIRET_CODE,
  SUBSCRIPTION_CHECK,
  QUOTATION_ACCEPTED_FOR_CLIENT,
  UNAVAILABLE_EMPLOYEE,
  SIGNUP_VIA_REFFERAL_CODE_CLIENT_TO_PRO,
} from 'src/constantes/constantes';

import {
  Pocke,
  Rating,
  Referred,
  Relationship,
  User,
} from './models/user.model';
import { SignInUserDto } from '../auth/dto/signIn.tdo';
import { HttpService } from '@nestjs/axios';
import { MailService } from 'src/mailling/mail.service';

import {
  generatePassword,
  generateRereferralCode,
  generateRereferralCode2,
} from 'src/shared/generateReferralCode';
import { JwtService } from '@nestjs/jwt';
import {
  emailtype,
  notifTag,
  privilege,
  quotationsType,
  ratingDirection,
  relationships,
  status,
} from 'src/shared/enums';

import { setTheme } from 'src/shared/generate.random.color';
import { dynamicLink } from 'src/shared/generateDynamicLink';
import { CompanyService } from '../companies/company.service';
import { QuotationDto, QuotationReplyDto } from './dto/quotation.dto';
import { QuotationService } from '../quotation/quotation.service';
import { FilesS3Service } from '../auth/s3.service';

import { FavouriteService } from '../favourite/favourite.service';
import { UserToken } from 'src/shared/tokenModel';
import { AppointmentService } from '../appointment/appointment.service';
import { EventsService } from '../events/events.service';
import {
  BackofficeNotifyAllUser,
  BackofficeNotifyUser,
  EditPasswordDto,
  EditProfilDto,
  ProDto,
} from './dto/edit.profil.dto';
import { Exceptionlookup } from 'src/shared/handling.error.message';
import { onRating, onRatingv2 } from 'src/shared/rating';
import { fetchRatingDto, RatingDto } from './dto/rating.dto';
import { AgendaUser } from './models/agenda.user.model';
import { Company } from '../companies/company.models';
import { Events } from '../events/schemas/event.entity';
import { ConfigNotifications } from './dto/config.notif.dto';
import { WalletService } from '../wallet/wallet.service';

import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notifications/notification.service';

import {
  dataPayload,
  NotificationMessage,
  onNotify,
} from 'src/shared/notif.class';

import { convertToCSV } from 'src/shared/json.to.csv';
import { Category } from '../category/schemas/category.entity';
import { setTokenDto } from './dto/set.token.dto';
import { platform } from 'os';
import { PaymentService } from '../payment/payment.service';
import { findMax } from 'src/shared/max';

const fs = require('fs');

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Relationship.name)
    private readonly relationshipsModel: Model<Relationship>,
    @InjectModel(Referred.name)
    private readonly referredsModel: Model<Referred>,
    @InjectModel(Rating.name)
    private readonly ratingModel: Model<Rating>,
    @InjectModel(Pocke.name)
    private readonly PockeModel: Model<Pocke>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
    @InjectModel(Events.name)
    private readonly eventsModel: Model<Events>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,

    // @InjectModel(Appointment.name)
    // private appointmentModel: Model<Appointment>,

    @InjectModel(AgendaUser.name)
    private readonly agendaUser: Model<AgendaUser>,
    private readonly httpService: HttpService,
    private mailService: MailService,
    private campanyService: CompanyService,
    private quotationService: QuotationService,
    private favouriteService: FavouriteService,
    private notificationService: NotificationService,
    private walletService: WalletService,
    private readonly filesService: FilesS3Service,
    private appointmentService: AppointmentService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventService: EventsService,
    private readonly paymentService: PaymentService,
  ) { }

  async updateStep(email: string, step: number) {
    return await this.userModel.findOneAndUpdate(
      { email },
      { configurationLevel: step },
    );
  }

  async siretVerificaation(siret: string) {
    /* fetch a token for the request */
    try {
      if (siret == '11111111111111')
        return apiReturner(HttpStatus.OK, VALID_SIRET_CODE);

      const tokenRequest = await this.httpService.axiosRef.post(
        'https://api.insee.fr/token',
        'grant_type=client_credentials',
        { headers: { Authorization: `Bearer ${process.env.SIRET_TOKEN}` } },
      );
      const token2 = process.env.NEW_TOKEN;
      const token = tokenRequest.data.access_token;
      const request = await this.httpService.axiosRef.get(
        `https://api.insee.fr/entreprises/sirene/V3/siret/${siret}`,

        { headers: { Authorization: `Bearer ${token}` } },
      );
      console.log(request);

      if (request.data.header.message == 'ok') {
        const result = await this.userModel.findOne({ siretNumber: siret });
        if (result) throw new ConflictException(ALREADY_EXIST);
        return apiReturner(HttpStatus.OK, VALID_SIRET_CODE);
      }
    } catch (e) {
      if (e.response.message == ALREADY_EXIST) {
        throw new ConflictException(ALREADY_EXIST);
      } else {
        throw new BadRequestException(INVALID_SIRET_CODE);
      }
    }

    //!
  }

  async getLevelService(_id: string) {
    const user = await this.userModel.findOne({
      _id,
    });
    const result = user.configurationLevel ? user.configurationLevel : 0;
    return apiReturner(HttpStatus.ACCEPTED, SUCCEEDED, {
      configurationLevel: result,
      user,
    });
  }

  async registerEmployeesService(employeesData, jwtservice: JwtService) {
    let returned_users = [];
    console.log('insaide regiter emplyeer');
    for (let i = 0; i < employeesData.length; i++) {
      /* check if the user exists */
      const check_exist = await this.userModel.findOne({
        email: employeesData[i].email,
      });
      //console.log(employeesData[i].profileImage);

      console.log(check_exist);
      if (check_exist) {
        const update_exist = await this.userModel.findOneAndUpdate(
          { email: employeesData[i].email },
          employeesData[i],
        );
        returned_users.push(update_exist._id);
      } else {
        let color = setTheme();
        const code = generateRereferralCode(5);
        console.log('heeeeeeeeeeeeeeeeeeeeeeeeer');
        const employeePass = generatePassword(PAGE_SIZE);
        const newEmp = await this.userModel.create({
          ...employeesData[i],
          themeColor: color,
          configurationLevel: null,
          payed_extras: null,
          accountVerified: true,
          available_team_members: null,
          unlimited_team_members: null,
          type: privilege.EMPLOYEE,
          referralCode: code,
          password: await bcrypt.hash(
            employeePass,
            parseInt(process.env.SALT_OR_ROUNDS),
          ),
          // referralCodeLink: await dynamicLink(
          //   code,
          //   'Code',
          //   'inscription/professionel',
          //   emailtype.PASS,
          // ),
          a_notif_before_appointment: true,
          a_notif_new_rating: true,
          a_notif_prestation_finished: true,
          ep_notif_ask_for_demande: true,
        });
        returned_users.push(newEmp._id);

        const emailIsSend =
          await this.mailService.sendEmailForAccountVerification(
            newEmp,
            jwtservice
              .sign({ _id: newEmp._id, role: privilege.EMPLOYEE })
              .toString(),
            employeePass,
          );
        console.log(emailIsSend ? 'valid' : 'Invalid');
      }

      //return apiReturner(HttpStatus.CREATED.toString(), SUCCEEDED);
    }
    return returned_users;
  }
  async registerUserByAdminService(userData: RegisterUserByAdminDto) {
    try {
      const newUser = await this.userModel.create({
        referralCode: generateRereferralCode(PAGE_SIZE),
        jobTitle: userData.jobTitle,
        addedByAdmin: true,
        configurationLevel: null,
        payed_extras: null,
        available_team_members: null,
        unlimited_team_members: null,
        available: null,
        available_events: null,
        active: null,
        ...userData,
      });

      if (newUser) {
        return apiReturner(
          HttpStatus.CREATED,
          SUCCEEDED,
          await newUser.populate('relatedCompany'),
        );
      }
    } catch (e) {
      this.logger.debug('User Not Registred or ' + e);
      throw new HttpException(
        'User Not Registred or this email already exist ',
        HttpStatus.CONFLICT,
      );
    }
  }
  async registerUserService(userData: RegisterUserDto, jwtService: JwtService) {
    try {
      const code = generateRereferralCode(5);
      const usr = await this.userModel.findOne({ email: userData.email });
      if (
        usr &&
        usr.email &&
        usr.siretNumber == null &&
        usr.type == privilege.PRO
      ) {
        console.log('user addedbyadmin');
        try {
          /* add wallet here */
          const newUser = await this.userModel.findOneAndUpdate(
            { email: userData.email },
            {
              ...userData,
              relatedCompany: null,
              addedByAdmin: false,
              configurationLevel: 0,
              referralCode: code,
              themeColor: setTheme(),
              referralCodeLink: await dynamicLink(
                code,
                'Code',
                'inscription/professionel',
                emailtype.PASS,
              ),

              password: await bcrypt.hash(
                userData.password,
                parseInt(process.env.SALT_OR_ROUNDS),
              ),
              a_notif_before_appointment: true,

              a_notif_new_rating: true,

              a_notif_prestation_finished: true,
            },
            { upsert: true, new: true },
          );
          await this.walletService.createWallet(newUser._id);
          switch (newUser.type) {
            // case privilege.CLIENT: {
            //   await this.userModel.updateOne(
            //     { _id: newUser._id },
            //     {
            //       c_notif_for_appointemnt_accepted: true,

            //       pc_notif_posp_or_dec_appointment: true,

            //       c_notif_begin_event_soon: true,
            //     },
            //   );
            //   break;
            // }
            case privilege.PRO: {
              await this.userModel.updateOne(
                { _id: newUser._id },
                {
                  available_events:10,
                  ep_notif_ask_for_demande: true,
                  p_notif_payment: true,
                  p_notif_new_event_signup: true,
                  pc_notif_posp_or_dec_appointment: true,
                },
              );
            }
            // case privilege.EMPLOYEE: {
            //   await this.userModel.updateOne(
            //     { _id: newUser._id },
            //     {
            //       ep_notif_ask_for_demande: true,
            //     },
            //   );
            //   await this.userModel.updateOne(
            //     { _id: newUser._id },
            //     {
            //       a_notif_before_appointment: null,

            //       a_notif_new_rating: null,

            //       a_notif_prestation_finished: null,
            //     },
            //   );
            //   break;
            // }
            // default:
            // case privilege.ADMIN:
            //   break;
          }
          if (!newUser)
            throw new ConflictException(
              apiReturner(HttpStatus.CONFLICT, INVALID_EMAIL).message,
            );
          const token = jwtService.sign({
            _id: newUser._id,
            role: newUser.type,
          });
          if (userData.jointByreferralCode) {
            const whoReferrals = await this.userModel.findOne({
              referralCode: userData.jointByreferralCode,
            });

            if (whoReferrals.referralCode == userData.jointByreferralCode)
              await this.mailService.sendEmailToInform(whoReferrals, newUser);
          } else {
            console.log('to inform :  mail did not sent');
          }
          if (newUser.addedByAdmin == false) {
            const mailsent =
              await this.mailService.sendEmailForAccountVerification(
                newUser,
                token,
              );

            if (mailsent) {
              this.logger.debug(
                '----Email was sent--------Email was sent--------Email was sent--------Email was sent----',
              );
            } else {
              this.logger.error(
                '----Email does not sent--------Email does not sent--------Email does not sent--------Email does not sent----',
              );
            }

            const {
              _id,
              firstName,
              lastName,
              city,
              companyName,
              accountVerified,
              profileImage,
              gallery,
              address,
              referralCode,
              email,
              relatedCompany,
              phoneNumber,
              themeColor,
              localization,
            } = newUser;

            // if (newUser.type == privilege.CLIENT) {
            //   if (mailsent) {
            //     return apiReturner(HttpStatus.CREATED, USER_CREATED, {
            //       User: {
            //         _id,
            //         firstName,
            //         lastName,
            //         city,
            //         companyName,
            //         accountVerified,
            //         profileImage,
            //         gallery,
            //         address,
            //         referralCode,
            //         email,
            //         phoneNumber,
            //         themeColor,
            //         relatedCompany: null,
            //         localization,
            //       },
            //     });
            //   } else {
            //     throw new InternalServerErrorException(
            //       'Something went wrong maybe email not sent',
            //     );
            //   }
            // } else {
            if (newUser.type == privilege.PRO) {
              if (mailsent) {
                return apiReturner(HttpStatus.CREATED, USER_CREATED, {
                  user: {
                    _id,
                    firstName,
                    lastName,
                    city,
                    companyName,
                    accountVerified,
                    profileImage,
                    relatedCompany,
                    gallery,
                    address,
                    referralCode,
                    email,
                    phoneNumber,
                    themeColor,
                    localization,
                  },
                });
              } else {
                throw new InternalServerErrorException(
                  apiReturner(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    'This email not sent',
                  ),
                );
              }
            }
          }
          // } else {
          // }
        } catch (e) {
          console.log(e);
          throw new ConflictException(
            apiReturner(HttpStatus.CONFLICT, 'This email exist'),
          );
        }
      } else if (userData.type == privilege.ADMIN) {
        const code = generateRereferralCode(5);
        console.log('***admin  inscription***');
        const newUser = await this.userModel.create({
          ...userData,
          accountVerified: true,

          referralCode: code,
          addedByAdmin: null,
          password: await bcrypt.hash(
            userData.password,
            parseInt(process.env.SALT_OR_ROUNDS),
          ),
        });
        return apiReturner(HttpStatus.OK, SUCCEEDED);
      } else {
        console.log('***simple user inscription***');
        try {
          if (usr)
            throw new InternalServerErrorException(
              apiReturner(HttpStatus.CONFLICT, 'account already exists'),
            );
          /* create user wallet */
          const newUser = await this.userModel.create({
            ...userData,
            relatedCompany: null,
            configurationLevel: 0,
            active: true,
            referralCode: code,
            addedByAdmin: false,
            themeColor: setTheme(),
            // referralCodeLink: await dynamicLink(
            //   code,
            //   'Code',
            //   'inscription/professionel',
            //   emailtype.PASS,
            // ),
            password: await bcrypt.hash(
              userData.password,
              parseInt(process.env.SALT_OR_ROUNDS),
            ),
            a_notif_before_appointment: true,
            a_notif_new_rating: true,
            a_notif_prestation_finished: true,
          });

          switch (newUser.type) {
            case privilege.CLIENT: {
              await this.userModel.updateOne(
                { _id: newUser._id },
                {
                  c_notif_for_appointemnt_accepted: true,
                  pc_notif_posp_or_dec_appointment: true,
                  c_notif_begin_event_soon: true,
                },
              );
              break;
            }
            case privilege.PRO: {
              await this.userModel.updateOne(
                { _id: newUser._id },
                {
                  ep_notif_ask_for_demande: true,
                  p_notif_payment: true,
                  p_notif_new_event_signup: true,
                  pc_notif_posp_or_dec_appointment: true,
                },
              );
              break;
            }
            case privilege.EMPLOYEE: {
              await this.userModel.updateOne(
                { _id: newUser._id },
                {
                  ep_notif_ask_for_demande: true,
                  a_notif_before_appointment: null,
                  a_notif_new_rating: null,
                  a_notif_prestation_finished: null,
                },
              );

              break;
            }
            case privilege.ADMIN:
              break;
            default:
              break;
          }

          await this.walletService.createWallet(newUser._id);
          //!config notification

          await this.userModel.findOneAndUpdate(
            { _id: newUser._id },
            {
              // referralLeadsCodeLink: await dynamicLink(
              //   [newUser._id, newUser.type],
              //   ['_id', 'type'],
              //   'leads',
              //   emailtype.LEADS,
              // ),
            },
          );

          console.log('eeeeeeeee');
          const token = jwtService.sign({
            _id: newUser._id,
            role: newUser.type,
          });
          if (userData.jointByreferralCode) {
            const whoReferrals = await this.userModel.findOne({
              referralCode: userData.jointByreferralCode,
            });

            if (whoReferrals.referralCode == userData.jointByreferralCode)
              if (
                whoReferrals.type == privilege.PRO &&
                userData.type == privilege.PRO
              ) {
                //todo : confirm parrinage relation!
                await this.relationshipsModel.create({
                  proId: whoReferrals._id,
                  _idProInMyNetwork: newUser._id,
                  _idclientInMyNetwork: null,
                  type: relationships.REFERRALSHIP,
                });
                await this.relationshipsModel.create({
                  proId: newUser._id,
                  _idProInMyNetwork: whoReferrals._id,
                  _idclientInMyNetwork: null,
                  type: relationships.REFERRALSHIP,
                });
                this.logger.debug(
                  'referral relationShip has been confirmed! ✍️',
                );
                await this.updateServices(whoReferrals._id, {
                  available_events:
                    whoReferrals.available_events + ADDETIONAL_EVENT,
                });

                let message: NotificationMessage = {
                  data: dataPayload({
                    tag: notifTag.SIGNUP_VIA_REFFERAL_CODE_PRO_TO_PRO,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    companyName: newUser.companyName,
                    badge: await this.notificationService.badge(
                      whoReferrals._id,
                    ),
                  }),

                  notification: SIGNUP_VIA_REFFERAL_CODE_PRO_TO_PRO(
                    await this.notificationService.badge(whoReferrals._id),
                  ),
                };

                await onNotify(
                  newUser,
                  whoReferrals,
                  this.notificationService,
                  message,
                );
                console.log(' notification sent ptp');
              } else if (
                whoReferrals.type == privilege.CLIENT &&
                userData.type == privilege.PRO
              ) {
                let message: NotificationMessage = {
                  data: dataPayload({
                    tag: notifTag.SIGNUP_VIA_REFFERAL_CODE_CLIENT_TO_PRO,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    companyName: newUser.companyName,
                    badge: await this.notificationService.badge(
                      whoReferrals._id,
                    ),
                  }),

                  notification: SIGNUP_VIA_REFFERAL_CODE_CLIENT_TO_PRO(
                    await this.notificationService.badge(whoReferrals._id),
                  ),
                };
                await onNotify(
                  newUser,
                  whoReferrals,
                  this.notificationService,
                  message,
                );
                console.log(' notification sent ctp');
              } else if (
                (whoReferrals.type == privilege.CLIENT &&
                  userData.type == privilege.CLIENT) ||
                (whoReferrals.type == privilege.PRO &&
                  userData.type == privilege.CLIENT)
              ) {

                let message: NotificationMessage = {
                  data: dataPayload({
                    tag: notifTag.SIGNUP_VIA_REFFERAL_CODE,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    companyName: newUser.companyName,
                    badge: await this.notificationService.badge(
                      whoReferrals._id,
                    ),
                  }),

                  notification: SIGNUP_VIA_REFFERAL_CODE(
                    await this.notificationService.badge(whoReferrals._id),
                  ),
                };
                await onNotify(
                  newUser,
                  whoReferrals,
                  this.notificationService,
                  message,
                );
                console.log(' notification sent ctc');
              }
            if (
              whoReferrals.type == privilege.EMPLOYEE &&
              userData.type == privilege.PRO
            ) {
              //!!hola
              const { pro } = await this.getProByEmployee(whoReferrals._id);
              const proUser = pro as User;
              await this.updateServices(proUser._id, {
                available_events: proUser.available_events + ADDETIONAL_EVENT,
              });

              let message: NotificationMessage = {
                data: dataPayload({
                  tag: notifTag.SIGNUP_VIA_REFFERAL_CODE_EMP_TO_PRO,
                  firstName: newUser.firstName,
                  lastName: newUser.lastName,
                  companyName: newUser.companyName,
                  badge: await this.notificationService.badge(whoReferrals._id),
                }),

                notification: SIGNUP_VIA_REFFERAL_CODE_EMP_TO_PRO(
                  await this.notificationService.badge(whoReferrals._id),
                ),
              };
              await onNotify(
                newUser,
                whoReferrals,
                this.notificationService,
                message,
              );
            }
          } else {
            console.log('inform  parinage mail did not sent');
          }
          //  console.log(newUser.addedByAdmin);
          if (newUser.addedByAdmin == false) {
            const mailsent =
              await this.mailService.sendEmailForAccountVerification(
                newUser,
                token,
              );
            console.log('here');

            const {
              _id,
              firstName,
              lastName,
              city,
              companyName,
              accountVerified,
              profileImage,
              gallery,
              address,
              referralCode,
              email,
              relatedCompany,
              phoneNumber,
              themeColor,
              localization,
            } = newUser;

            if (newUser.type == privilege.CLIENT) {
              if (mailsent) {
                return apiReturner(HttpStatus.CREATED, USER_CREATED, {
                  User: {
                    _id,
                    firstName,
                    lastName,
                    city,
                    companyName,
                    accountVerified,
                    profileImage,
                    gallery,
                    address,
                    referralCode,
                    email,
                    phoneNumber,
                    themeColor,
                    relatedCompany: null,
                    localization,
                  },
                });
              } else {
              }
            } else {
              if (newUser.type == privilege.PRO) {
                if (mailsent) {
                  return apiReturner(HttpStatus.CREATED, USER_CREATED, {
                    user: {
                      _id,
                      firstName,
                      lastName,
                      city,
                      companyName,
                      accountVerified,
                      profileImage,
                      relatedCompany,
                      gallery,
                      address,
                      referralCode,
                      email,
                      phoneNumber,
                      themeColor,
                      localization,
                    },
                  });
                } else {
                }
              }
            }
          } else {
          }
        } catch (e) {
          console.log(e);

          throw new InternalServerErrorException(
            apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, e),
          );
        }
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(
        apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, e),
      );
    }
  }

  async signInUser(userData: SignInUserDto) {
    console.log(userData.email, userData.password);
    const loggingUser = await this.userModel.findOne({
      email: userData.email,
    });
    try {
      //  console.log('this one', loggingUser);
      if (loggingUser != null || loggingUser != undefined) {
        const isMatch = await bcrypt.compare(
          userData.password,
          loggingUser.password,
        );
        if (isMatch) {
          if (loggingUser.accountVerified.toString() == 'true') {
            const badge = await this.notificationService.badge(loggingUser._id);
            const badgeNumber = Number(badge);
            await this.userModel.updateOne(
              { _id: loggingUser._id },
              {
                badgeCounter: badgeNumber == 0 ? badgeNumber : badgeNumber - 1,
              },
            );
          }
          return await loggingUser.populate([
            'subscription',
            'relatedCompany',
            // 'prestations',
          ]);
        } else {
          return null;
        }
      } else {
        console.log(userData, loggingUser);
        throw new ForbiddenException(
          apiReturner(
            HttpStatus.FORBIDDEN,
            INVALID_CREDENTIALS + ' ***unique from else***',
          ),
        );
      }
    } catch (error) {
      Exceptionlookup(error);
      throw new ForbiddenException(
        apiReturner(HttpStatus.FORBIDDEN, INVALID_CREDENTIALS),
      );
    }
  }

  async findUserBy(attrebiute: any) {
    try {
      const user = await this.userModel.findOne(attrebiute);
      if (user) {
        return user;
      } else {
        return null;
      }
    } catch (e) {
      throw new InternalServerErrorException(
        apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, SOMETHING_WENT_WRONG),
      );
    }
  }
  async findUserByAndPopSub(attrebiute: any) {
    try {
      const user = await this.userModel
        .findOne(attrebiute)
        .populate('subscription');
      if (user) {
        return user;
      } else {
        return null;
      }
    } catch (e) {
      throw new InternalServerErrorException(
        apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, SOMETHING_WENT_WRONG),
      );
    }
  }
  async findUserByWithPopulatedAgenda(attrebiute: any) {
    try {
      const user = await this.userModel
        .findOne(attrebiute)
        .populate('userAgenda');
      if (user) {
        return user;
      } else {
        return null;
      }
    } catch (e) {
      throw new InternalServerErrorException(
        apiReturner(HttpStatus.INTERNAL_SERVER_ERROR, SOMETHING_WENT_WRONG),
      );
    }
  }

  async UpdateUserById(_id, userData: any) {
    const user = await this.userModel.updateOne(
      { _id },
      {
        ...userData,
      },
    );
    if (user) {
      return user;
    } else {
      return null;
    }
  }
  async updateServices(_id: string, attributes: any) {
    // console.log(attributes);
    const me = await this.userModel.findOne({ _id });

    const payloadType = Object.assign(EditPasswordDto, attributes).name;
    /* fetch the user to check the step */

    const fetch_user = await this.userModel.findOne({ _id });
    if (fetch_user.configurationLevel > attributes.configurationLevel)
      delete attributes.configurationLevel;

    if (attributes.newPassword && payloadType == EditPasswordDto.name) {
      const { password } = await this.userModel.findOne({ _id });
      if (await bcrypt.compare(attributes.lastPassword, password)) {
        await this.userModel.updateOne(
          { _id },
          {
            password: await bcrypt.hash(
              attributes.newPassword.toString(),
              parseInt(process.env.SALT_OR_ROUNDS),
            ),
          },
        );
        return apiReturner(HttpStatus.CREATED, SUCCEEDED);
      } else {
        throw new HttpException(
          'maybe your previous password was invalid',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } else if (
      me.type == privilege.PRO ||
      me.type == privilege.CLIENT ||
      me.type == privilege.EMPLOYEE
    ) {
      if (me && me.configurationLevel > attributes.configurationLevel)
        delete attributes.configurationLevel;

      if (!(attributes.password == undefined)) {
        // if password existe :

        //  const user = await this.userModel.findById({ _id: _id });
        const u = await this.userModel.updateOne(
          { _id: _id },
          {
            ableToChangePassword: false,
            password: await bcrypt.hash(
              attributes.password.toString(),
              parseInt(process.env.SALT_OR_ROUNDS),
            ),
          },
        );
        return apiReturner(HttpStatus.CREATED, SUCCEEDED, u);
      } else {
        this.logger.warn('expected here');
        await this.userModel.updateOne({ _id: _id }, attributes);
        if (attributes.phoneNumber) {
          await this.campanyService.updateCompany(_id, {
            companyPhoneNumber: attributes.phoneNumber,
            company_country_code: attributes.country_code,
            company_iso_code: attributes.iso_code,
            company_phone_number_without_iso:
              attributes.phone_number_without_iso,
          });
        }
        if (attributes.companyName) {
          await this.campanyService.updateCompany(_id, {
            companyName: attributes.companyName,
          });
        }
        console.log(attributes);

        return apiReturner(HttpStatus.CREATED, 'SUCCEEDEDo', attributes);
      }
    } else if (privilege.ADMIN) {
      console.log(attributes);

      const u = await this.userModel.updateOne(
        { _id: _id },
        {
          ...attributes,
        },
      );
    }
    // } catch (e) {
    //   return new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    // }
  }
  async deleteUserservice(email: string) {
    const deleted = await this.userModel.deleteOne({ email });
    if (deleted) {
      return apiReturner(HttpStatus.OK, SUCCEEDED);
    } else {
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }
  }
  //!-------------------------------------------------------sprint2
  async onPokeService(email: string, id: string) {
    try {
      //  console.log('this email : ', email);
      const usrReq = await this.userModel.findOne({ _id: id });
      const pocked = await this.userModel.findOne({
        email: email,
        addedByAdmin: true,
      });
      const shortLink = await dynamicLink(id, 'id', 'welcome-new-user');
      const shortLinkWeb = process.env.F_URL + 'inscription?id=' + id;
      const isDone = await this.mailService.onSendEmailForProPoke(
        pocked,
        usrReq,
        shortLink.toString(),
        shortLinkWeb,
      );
      await this.PockeModel.findOneAndUpdate(
        { from: id, to: pocked._id, active: true },
        { from: id, to: pocked._id, active: true },
        { upsert: true },
      );

      const adminDone = await this.mailService.onSendEmailForProPokeAdmin(
        'contact@beyang.io',
        usrReq,
        pocked,
      );

      //633d93eb896cf17409b0c8c0

      if (isDone && adminDone) {
        return apiReturner(HttpStatus.CREATED, SUCCEEDED);
      } else {
        throw new HttpException(
          'email_not_sent_maybe_mail_not_valid'.toUpperCase(),
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (e) {
      Exceptionlookup(e);
      throw new HttpException(
        'email_not_sent_maybe_mail_not_valid'.toUpperCase(),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUsersByRole(
    addedByAdmin: boolean,
    role?: string,
    toSearch?: any,
    page_number?: number,
    page_size?: number,
  ) {
    let query = {};
    try {
      if (addedByAdmin) {
        query = { addedByAdmin };
      } else {
      }

      // const t0 = performance.now();
      // console.log('here' + toSearch && role in privilege);
      if (toSearch && role in privilege) {
        // const t1 = performance.now();
        //  console.log(toSearch, role);
        const resultLen = (
          await this.userModel.find({
            $and: [
              {
                type: role,
                deleted: false,
               
              },
              query,
              {
                $or: [
                  {
                    firstName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    companyName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    firstName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    lastName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    email: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    jobTitle: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    address: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    phoneNumber: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    city: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          })
        ).length;

        const result = await this.userModel
          .find({
            $and: [
              {
                type: role,
                deleted: false,
               
              },
              query,
              {
                $or: [
                  {
                    firstName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    companyName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    firstName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    lastName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    email: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    jobTitle: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    address: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    phoneNumber: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    city: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          })

          .populate({
            path: 'relatedCompany',
            populate: { path: 'categories', populate: 'parentCategory' },
          })
          .populate('subscription')
          .sort({ createdAt: -1 })
          .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
          .limit(page_number && page_size ? +page_size : 10);
        //  console.log(result);

        return { result, resultLen };
      } else if (role && toSearch == null) {
        //  console.log('toSearch==null');
        const resultLen = (
          await this.userModel.find({
            deleted: false,
           
            type: {
              $regex: new RegExp(`${role}`),
              $options: 'i',
            },
            ...query,
          })
        ).length;
        const result = await this.userModel
          .find({
            deleted: false,
           
            type: {
              $regex: new RegExp(`${role}`),
              $options: 'i',
            },
            ...query,
          })
          .populate({
            path: 'relatedCompany',
            populate: { path: 'categories', populate: 'parentCategory' },
          })
          .populate('subscription')
          .sort({ createdAt: -1 })
          .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
          .limit(page_number && page_size ? +page_size : 10);

        return { result, resultLen };
      } else if (role == null && toSearch) {
        // console.log('role==null');

        const resultLen = (
          await this.userModel.find({
            deleted: false,
          
            $or: [
              {
                firstName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                companyName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                firstName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                lastName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                email: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                jobTitle: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                address: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                phoneNumber: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                city: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                type: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
            ],
            ...query,
          })
        ).length;
        const result = await this.userModel
          .find({
           
            deleted: false,
            $or: [
              {
                firstName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                companyName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                firstName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                lastName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                email: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                jobTitle: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                address: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                phoneNumber: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                city: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                type: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
            ],
            ...query,
          })
          .populate({
            path: 'relatedCompany',
            populate: { path: 'categories', populate: 'parentCategory' },
          })
          .populate('subscription')
          .sort({ createdAt: -1 })
          .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
          .limit(page_number && page_size ? +page_size : 10);
        return { result, resultLen };
      } else {
        console.log('tihs');
        const result = await this.userModel
          .find({ ...query, deleted: false })
          .populate({
            path: 'relatedCompany',
            populate: { path: 'categories', populate: 'parentCategory' },
          })
          .populate('subscription')
          .sort({ createdAt: -1 })
          .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
          .limit(page_number && page_size ? +page_size : 10);
        return { result, resulLen: result.length };
      }
    } catch (error) {
      var t1 = performance.now();
      this.logger.debug(error + 'users not exist or role not valid');
      throw new HttpException(
        'users not exist or role node valid or' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  // async getProCardDetailsService(_idPro: string, me: UserToken) {
  //   let userdetails = null;
  //   userdetails = await this.campanyService.getCompanyByUserId(_idPro);

  //   if (userdetails) {
  //     const exist = await this.favouriteService.getFavouritesByClientToPro(
  //       me._id,
  //       _idPro,
  //     );
  //     exist ? (userdetails['isFav'] = true) : (userdetails['isFav'] = false);

  //     return apiReturner(HttpStatus.OK, SUCCEEDED, userdetails);
  //   } else {
  //     apiReturner(HttpStatus.OK, 'company does not exist');
  //   }
  // }

  async getProCardDetailsService(_idPro: string, me: UserToken) {
    let userdetails;
    console.log(_idPro, me);

    if (me.role == privilege.EMPLOYEE) {
      // const exist = await this.favouriteService.getFavouritesByClientToPro(
      //   me._id,
      //   _idPro,
      // );
      // exist ? (userdetails['isFav'] = true) : (userdetails['isFav'] = false);

      userdetails = await this.campanyService.getCompanyByEmpId(_idPro);
      if (userdetails) {
        const exist = await this.favouriteService.getFavouritesByClientToPro(
          me._id,
          _idPro,
        );
        exist ? (userdetails['isFav'] = true) : (userdetails['isFav'] = false);

        userdetails = await this.campanyService.getCompanyByEmpId(_idPro)
        if (userdetails) {

          return apiReturner(HttpStatus.OK, SUCCEEDED, userdetails);
        } else {
          apiReturner(HttpStatus.OK, 'company does not exist');
        }
      }
    } else {
      userdetails = await this.campanyService.getCompanyByUserId(_idPro);

      if (userdetails) {
        const exist = await this.favouriteService.getFavouritesByClientToPro(
          me._id,
          _idPro,
        );
        exist ? (userdetails['isFav'] = true) : (userdetails['isFav'] = false);

        return apiReturner(HttpStatus.OK, SUCCEEDED, userdetails);
      } else {
        return apiReturner(HttpStatus.OK, 'company does not exist');
      }
    }
  }

  //! favourites---------------------------------------------------------------------------------

  async addTofavouriteServicev2(me: UserToken, idPro: string) {
    try {
      // console.log(me, idPro);
      const isPro = await this.userModel.findOne({ _id: idPro });
      if (isPro.type != privilege.PRO) {
        throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
      }

      const fav = await this.favouriteService.getFavouritesByClientToPro(
        me._id,
        idPro,
      );

      if (fav) {
        await this.favouriteService.removeFavourite(fav._id);
        return apiReturner(HttpStatus.OK, SUCCEEDED + ': fav has been removed');
      } else {
        await this.favouriteService.createFavourite({
          fromClient: me._id,
          toPro: idPro,
        });
        return apiReturner(HttpStatus.OK, SUCCEEDED + ': has been added');
      }
    } catch (e) {
      throw new HttpException(
        SOMETHING_WENT_WRONG +
        ' take a look to addTofavouriteServicev2 method ',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  //!! Quotation-----------
  async sendQuotationv2(
    formUser: UserToken,
    toProId: string,
    quotationData: QuotationDto,
  ) {
    try {
      const userToask = await this.userModel.findOne({ _id: toProId });
      const whoAsk = await this.userModel.findOne({ _id: formUser._id });
      if (userToask.type == privilege.PRO) {
        const num_quo = await this.quotationService.getQuotationLengthByPro(
          toProId,
        );

        const createQuotation = await this.quotationService.createQuotation({
          to: toProId,
          from: formUser._id,
          num_quo: num_quo + 1,
          status: status.PENDING,
          description: quotationData.description,
          onLineMeeting: quotationData.onLineMeeting,
          at_home: quotationData.at_home,
          at_business: quotationData.at_business,
          reply: null,
        });

        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.QUOTATION_DEMANDE_FOR_PRO,
            firstName: whoAsk.firstName == null ? '' : whoAsk.firstName,
            lastName: whoAsk.lastName == null ? '' : whoAsk.lastName,
            companyName: whoAsk.companyName == null ? '' : whoAsk.companyName,
            badge: await this.notificationService.badge(userToask._id),
          }),

          notification: QUOTATION_DEMANDE_FOR_PRO(
            await this.notificationService.badge(userToask._id),
          ),
        };
        //  console.log(message);

        await onNotify(whoAsk, userToask, this.notificationService, message);

        //************************************************************************** */

        // let message: NotificationMessage = {
        //   data: {
        //     firstName: whoAsk.firstName,
        //     lastName: whoAsk.lastName,
        //     companyName: whoAsk.companyName,
        //   },
        //   notification: QUOTATION_DEMANDE_FOR_PRO(
        //     whoAsk.firstName,
        //     whoAsk.lastName,
        //     whoAsk.companyName,
        //   ),
        // };
        // await onNotify(whoAsk, userToask, this.notificationService, message);

        return apiReturner(
          HttpStatus.CREATED,
          SUCCEEDED,
          await createQuotation.populate([
            {
              path: 'from',
              select: '-_id firstName',
            },
            {
              path: 'to',
              select: '-_id companyName',
            },
          ]),
        );
      } else {
        throw new HttpException(
          ' maybe you trying to send an quotation to an Invalid User ',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (e) {
      this.logger.debug(
        'something went wrong when we adding new favourites around ligne 211PAGE_SIZE : ' +
        e,
      );
      throw new HttpException(
        'something went wrong when we adding new favourites ligne 2122 : ' + e,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  //!! Quotation----------- will change----------------------------------------------------------------------
  //? ----------------getQuotationsV2-------------
  async getProQuotations(
    user: UserToken,
    page_number: number,
    page_size: number,
    toSearch?: string,
  ) {
    try {
      toSearch == undefined || toSearch == null ? (toSearch = '') : '';
      if (user.role == privilege.PRO) {
        console.log('from pro');
        const { quotations, quotationsLength } =
          await this.quotationService.getProQuotations(
            user._id,
            toSearch,
            page_number,
            page_size,
          );
        return {
          statusCode: 200,
          message: 'API.QUOTATION_FETCHED',
          data: [...quotations],
          page_number,
          total_attributs: quotationsLength,
        };
      } else if (user.role == privilege.CLIENT) {
        return {
          statusCode: 200,
          message: 'API.QUOTATION_FETCHED',
          data: [],
          page_number,
          total_attributs: 0,
        };
      }
    } catch (e) { }
  }

  async getQuotations(
    user: UserToken,
    page_number: number,
    page_size: number,
    toSearch?: string,
  ) {
    try {
      let mongoose = require('mongoose');
      let castedUserId = mongoose.Types.ObjectId(user._id);

      toSearch == undefined || toSearch == null ? (toSearch = '') : '';

      const quotationslenght = (
        await this.userModel.aggregate([
          {
            $lookup: {
              from: 'quotations',
              localField: 'quotations',
              foreignField: '_id',
              as: 'quotations',
            },
          },
          { $unwind: '$quotations' },

          {
            $lookup: {
              from: 'users',
              localField: 'quotations.from',
              foreignField: '_id',
              as: 'quotations.from',
            },
          },
          { $unwind: '$quotations.from' },
          {
            $project: {
              'quotations.from.password': 0,
              'quotations.from.quotations': 0,
              'quotations.from.favouritesListe': 0,
              'quotations.from.siretNumber': 0,
              'quotations.from.accountVerified': 0,
              'quotations.from.ableToChangePassword': 0,
              'quotations.from.referralCode': 0,
            },
          },
          {
            $match: {
              $and: [
                {
                  $or: [
                    {
                      'quotations.description': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'quotations.from.firstName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'quotations.from.lastName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'quotations.from.companyName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
                { type: privilege.PRO },
                { 'quotations.to': castedUserId },
              ],
            },
          },
          { $project: { quotations: 1, _id: 0 } },
          { $sort: { 'quotations.createdAt': -1 } },
        ])
      ).length;
      const quotations = await this.userModel.aggregate([
        {
          $lookup: {
            from: 'quotations',
            localField: 'quotations',
            foreignField: '_id',
            as: 'quotations',
          },
        },
        { $unwind: '$quotations' },

        {
          $lookup: {
            from: 'users',
            localField: 'quotations.from',
            foreignField: '_id',
            as: 'quotations.from',
          },
        },
        { $unwind: '$quotations.from' },
        {
          $project: {
            'quotations.from.password': 0,
            'quotations.from.quotations': 0,
            'quotations.from.favouritesListe': 0,
            'quotations.from.siretNumber': 0,
            'quotations.from.accountVerified': 0,
            'quotations.from.ableToChangePassword': 0,
            'quotations.from.referralCode': 0,
          },
        },
        {
          $match: {
            $and: [
              {
                $or: [
                  {
                    'quotations.description': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'quotations.from.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'quotations.from.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'quotations.from.companyName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
              { type: privilege.PRO },
              { 'quotations.to': castedUserId },
            ],
          },
        },
        { $project: { quotations: 1, _id: 0 } },
        { $sort: { 'quotations.createdAt': -1 } },
        {
          $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
        },
        { $limit: page_number && page_size ? +page_size : 10 },
      ]);

      return {
        statusCode: 200,
        message: 'API.QUOTATION_FETCHED',
        data: [...quotations],
        page_number,
        total_attributs: quotationslenght,
      };
    } catch (e) {
      this.logger.error(SOMETHING_WENT_WRONG + ' in ');
      throw new HttpException(
        SOMETHING_WENT_WRONG + ' in ' + e,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getQuotationById(id_Quo: string) {
    const quotation = await this.quotationService.getQuotation(id_Quo);
    if (quotation) {
      return apiReturner(HttpStatus.OK, SUCCEEDED, quotation);
    } else {
      this.logger.error(
        SOMETHING_WENT_WRONG + ' in between line 22PAGE_SIZE1 and 22PAGE_SIZE6',
      );

      throw new HttpException(
        SOMETHING_WENT_WRONG,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async replyToQuotationv2(
    user: User,
    _id_Quotation: string,
    data: QuotationReplyDto,
    devis: Express.Multer.File,
    join?: Express.Multer.File,
  ) {
    try {
      const { _id } = await this.userModel.findOne({ _id: user._id });

      const ToFromQuo = await this.getQuotationById(_id_Quotation);
      //  console.log(ToFromQuo.data.to._id == _id);
      if (ToFromQuo.data.to._id.toString() == _id) {
        // if (quotations && quotations.some((data) => data._id == _id_Quotation)) {
        if (!join) {
          //  console.log(devis);
          if (devis.mimetype == 'application/pdf') {
            const { Location } = await this.filesService.uploadPdfFile(
              devis.buffer,
              `Devis_num${ToFromQuo.data.num_quo}_${ToFromQuo.data.from.firstName}_${ToFromQuo.data.from.last}`,
              // generateRereferralCode(15) + Date.now().toString(),
            );
            // console.log(Location);
            await this.quotationService.updateQuotation(_id_Quotation, {
              status: status.ACCEPTED,
              reply: { ...data, files: Location.split('com/')[1] },
            });

            let message: NotificationMessage = {
              data: dataPayload({
                tag: notifTag.QUOTATION_ACCEPTED_FOR_CLIENT,
                firstName: ToFromQuo.data.to.firstName,
                lastName: ToFromQuo.data.to.lastName,
                companyName: ToFromQuo.data.to.companyName,
                num_quo: ToFromQuo.data.num_quo.toString(),
                start_date: ToFromQuo.data.createdAt.toISOString(),
                badge: await this.notificationService.badge(
                  ToFromQuo.data.from._id,
                ),
              }),

              notification: QUOTATION_ACCEPTED_FOR_CLIENT(
                await this.notificationService.badge(ToFromQuo.data.from._id),
              ),
            };

            await onNotify(
              ToFromQuo.data.to,
              ToFromQuo.data.from,
              this.notificationService,
              message,
            );

            return apiReturner(HttpStatus.CREATED, SUCCEEDED);
          } else {
            const { Location } = await this.filesService.uploadFile(
              devis.buffer,
              `Devis_num${ToFromQuo.data.num_quo}_${ToFromQuo.data.from.firstName}_${ToFromQuo.data.from.firstName}`,
            );
            //console.log(Location);
            await this.quotationService.updateQuotation(_id_Quotation, {
              status: status.ACCEPTED,
              reply: {
                ...data,

                files: Location.split('com/')[1],
              },
            });
            let message: NotificationMessage = {
              data: dataPayload({
                tag: notifTag.QUOTATION_ACCEPTED_FOR_CLIENT,
                firstName: ToFromQuo.data.to.firstName,
                lastName: ToFromQuo.data.to.lastName,
                companyName: ToFromQuo.data.to.companyName,
                num_quo: ToFromQuo.data.num_quo.toString(),
                start_date: ToFromQuo.data.createdAt.toISOString(),
                badge: await this.notificationService.badge(
                  ToFromQuo.data.from._id,
                ),
              }),

              notification: QUOTATION_ACCEPTED_FOR_CLIENT(
                await this.notificationService.badge(ToFromQuo.data.from._id),
              ),
            };

            await onNotify(
              ToFromQuo.data.to,
              ToFromQuo.data.from,
              this.notificationService,
              message,
            );

            //************************************************************************** */

            return apiReturner(HttpStatus.CREATED, SUCCEEDED);
          }
        } else {
          const table = [devis, join];

          const locations = await Promise.all(
            table.map(async (file) => {
              // console.log('heee');
              // console.log(file.mimetype);
              if (file.mimetype == 'application/pdf') {
                const { Location } = await this.filesService.uploadPdfFile(
                  file.buffer,
                  generateRereferralCode(15) + Date.now().toString(),
                );
                return Location.split('com/')[1];
              } else {
                const { Location } = await this.filesService.uploadFile(
                  file.buffer,
                  generateRereferralCode(15) + Date.now().toString(),
                );
                return Location.split('com/')[1];
              }
            }),
          );

          await this.quotationService.updateQuotation(_id_Quotation, {
            status: status.ACCEPTED,
            reply: { ...data, files: locations },
          });
          let message: NotificationMessage = {
            data: dataPayload({
              tag: notifTag.QUOTATION_ACCEPTED_FOR_CLIENT,
              firstName: ToFromQuo.data.to.firstName,
              lastName: ToFromQuo.data.to.lastName,
              companyName: ToFromQuo.data.to.companyName,
              num_quo: ToFromQuo.data.num_quo.toString(),
              start_date: ToFromQuo.data.createdAt.toISOString(),
              badge: await this.notificationService.badge(
                ToFromQuo.data.from._id,
              ),
            }),

            notification: QUOTATION_ACCEPTED_FOR_CLIENT(
              await this.notificationService.badge(ToFromQuo.data.from._id),
            ),
          };

          await onNotify(
            ToFromQuo.data.to,
            ToFromQuo.data.from,
            this.notificationService,
            message,
          );
          return apiReturner(HttpStatus.CREATED, SUCCEEDED);
        }
      } else {
        throw new HttpException(
          'this quotation does not belong to user of id : ' + user._id,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (e) {
      this.logger.error('something went wrong in users.services line 1116' + e);
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  //? -----------------
  async createClientShip(user: any, idClient: string) {
    try {
      const proId = user.id != null || user._id != undefined ? user._id : user;
      // console.log(proId);
      return await this.relationshipsModel.findOneAndUpdate(
        {
          proId,
          _idclientInMyNetwork: idClient,
          _idProInMyNetwork: null,
          type: relationships.CLIENTSHIP,
        },
        {
          proId,
          _idclientInMyNetwork: idClient,
          _idProInMyNetwork: null,
          type: relationships.CLIENTSHIP,
        },
        { upsert: true, new: true },
      );
    } catch (e) {
      Exceptionlookup(e);
      throw new InternalServerErrorException(e.message);
    }
  }
  async getProCardAndSearchv3(
    userId: string,
    subCat: string,
    page_number: number,
    page_size: number,
    toSearch?: string,
    longitude?: number,
    latitude?: number,
  ) {
    try {
      toSearch == undefined || toSearch == null ? (toSearch = '') : '';

      //
      //
      //

      if (longitude == undefined || latitude == undefined) {
        //todo order alpha
        var mongoose = require('mongoose');
        var id = mongoose.Types.ObjectId(subCat);
        //   console.log(SUBSECRIPTION_PAYMENT_CONDITION, SUBSCRIPTION_CHECK);

        const usersWithoutlocationLenght = (
          await this.userModel.aggregate([
            {
              $lookup: {
                from: 'companies',
                localField: 'relatedCompany',
                foreignField: '_id',
                as: 'relatedCompany',
              },
            },

            {
              $unwind: {
                path: '$relatedCompany',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'prestations',
                localField: 'relatedCompany.prestations',
                foreignField: '_id',
                as: 'relatedCompany.prestations',
              },
            },
            // {
            //   $lookup: {
            //     from: 'users',
            //     localField: '_id',
            //     foreignField: '_id',
            //     as: 'relatedCompany.employees',
            //   },
            // },
            {
              $lookup: {
                from: 'users',
                localField: 'relatedCompany.employees',
                foreignField: '_id',
                as: 'relatedCompany.employees',
              },
            },
            {
              $lookup: {
                from: 'categories',
                localField: 'relatedCompany.categories',
                foreignField: '_id',
                as: 'relatedCompany.categories',
              },
            },

            ...SUBSCRIPTION_CHECK,
            {
              $match: {
                $and: [
                  {
                    'relatedCompany.categories._id': id,
                  },
                  { type: privilege.PRO },
                  { configurationLevel: 12 },
                  { addedByAdmin: false },
                  ...SUBSECRIPTION_PAYMENT_CONDITION,
                  {
                    $or: [
                      {
                        firstName: {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        lastName: {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        'relatedCompany.companyName': {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        'relatedCompany.job': {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        email: {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ])
        ).length;
        console.log('toSearch : ' + toSearch);

        let usersWithoutlocationaltoSerach = await this.userModel.aggregate([
          {
            $lookup: {
              from: 'companies',
              localField: 'relatedCompany',
              foreignField: '_id',
              as: 'relatedCompany',
            },
          },

          {
            $unwind: {
              path: '$relatedCompany',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'prestations',
              localField: 'relatedCompany.prestations',
              foreignField: '_id',
              as: 'relatedCompany.prestations',
            },
          },
          // {
          //   $lookup: {
          //     from: 'users',
          //     localField: '_id',
          //     foreignField: '_id',
          //     as: 'relatedCompany.employees',
          //   },
          // },
          // {
          //   $lookup: {
          //     from: 'agendausers',
          //     localField: 'relatedCompany.employees.userAgenda',
          //     foreignField: '_id',
          //     as: 'relatedCompany.employees.userAgenda',
          //   },
          // },
          // {$unwind:"$relatedCompany.employees.userAgenda"},
          {
            $lookup: {
              from: 'users',
              localField: 'relatedCompany.employees',
              foreignField: '_id',
              as: 'relatedCompany.employees',
            },
          },
          {
            $lookup: {
              from: 'categories',
              localField: 'relatedCompany.categories',
              foreignField: '_id',
              as: 'relatedCompany.categories',
            },
          },
          ...SUBSCRIPTION_CHECK,
          {
            $match: {
              $and: [
                {
                  'relatedCompany.categories._id': id,
                },
                { type: privilege.PRO },
                { addedByAdmin: false },
                { configurationLevel: 12 },

                ...SUBSECRIPTION_PAYMENT_CONDITION,
                {
                  $or: [
                    {
                      firstName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      lastName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.companyName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.job': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      email: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            },
          },
          //  { $project: { checkPayment: 0 } },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * page_size : 0,
          },
          { $limit: page_number && page_size ? +page_size : 10 },
          { $sort: { firstName: 1 } },
        ]);

        await this.userModel.populate(usersWithoutlocationaltoSerach, {
          path: 'userAgenda',
        });

        const resultForUsers = await Promise.all(
          usersWithoutlocationaltoSerach.map(async (userPro: User) => {
            const exist =
              await this.favouriteService.getFavouritesByClientToPro(
                userId,
                userPro._id,
              );

            if (exist) {
              userPro.isFav = true;
              return userPro;
            } else {
              userPro.isFav = false;
              return userPro;
            }
          }),
        );

        const userAddedByAdmin = await this.userModel
          .find({
            $and: [
              { type: 'PRO' },
              { addedByAdmin: true },
              { suggestedSubCategory: subCat },
              {
                $or: [
                  {
                    firstName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    lastName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'relatedCompany.companyName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'relatedCompany.job': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    email: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          })
          .populate({
            path: 'relatedCompany',
            populate: [
              { path: 'prestations' },
              { path: 'employees' },
              { path: 'categories' },
            ],
          })
          .sort({ firstName: 1 })
          .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
          .limit(page_number && page_size ? +page_size : 10);

        const userAddedByAdminlegnth = (
          await this.userModel
            .find({
              $and: [
                { type: 'PRO' },
                { addedByAdmin: true },
                { suggestedSubCategory: subCat },
                {
                  $or: [
                    {
                      firstName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      lastName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.companyName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.job': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      email: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            })
            .populate({
              path: 'relatedCompany',
              populate: [
                { path: 'prestations' },
                { path: 'employees' },
                { path: 'categories' },
              ],
            })
        ).length;

        return {
          statusCode: 200,
          message: 'API_result',
          data: {
            listeUserPro: resultForUsers,
            listeBo: userAddedByAdmin,
          },
          page_number: page_number,
          total_attributs_pro: usersWithoutlocationLenght,
          total_attributs_pro_bo: userAddedByAdminlegnth,
        };

        // //todo search in exist
      } else {
        let usersByComapny = [];
        const { campaniesLength, pro } =
          await this.campanyService.nearestTosearch(
            subCat,
            longitude,
            latitude,
            page_number,
            page_size,
            toSearch,
          );
        //   console.log('campanies', campanies);

        // console.log(pro.length);
        pro.map(async (data: User) => {
          const exist = await this.favouriteService.getFavouritesByClientToPro(
            userId,
            data._id,
          );
          if (exist) {
            data.isFav = true;
            return data;
          } else {
            data.isFav = false;
            return data;
          }
        });
        const usersProLength = campaniesLength;
        const userAddedByAdmin = await this.userModel
          .find({
            $and: [
              { type: 'PRO' },
              { addedByAdmin: true },
              { suggestedSubCategory: subCat },
              {
                $or: [
                  {
                    firstName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    lastName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'relatedCompany.companyName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'relatedCompany.job': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    email: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          })
          .populate({
            path: 'relatedCompany',
            populate: [
              { path: 'prestations' },
              { path: 'employees' },
              { path: 'categories' },
            ],
          })
          .sort({ firstName: 1 })
          .skip(page_number && page_size ? (+page_number - 1) * page_size : 0)
          .limit(page_number && page_size ? +page_size : 10);

        const userAddedByAdminlegnth = (
          await this.userModel
            .find({
              $and: [
                { type: 'PRO' },
                { addedByAdmin: true },
                { suggestedSubCategory: subCat },
                {
                  $or: [
                    {
                      firstName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      lastName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.companyName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.job': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      email: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            })
            .populate({
              path: 'relatedCompany',
              populate: [
                { path: 'prestations' },
                { path: 'employees' },
                { path: 'categories' },
              ],
            })
        ).length;

        return {
          statusCode: 200,
          message: 'API_result',
          data: {
            listeUserPro: [...pro],
            listeBo: [...userAddedByAdmin],
          },
          page_number: page_number,
          total_attributs_pro: usersProLength,
          total_attributs_pro_bo: userAddedByAdminlegnth,
        };
      }
    } catch (erorr: unknown) {
      this.logger.error(erorr);
      throw new InternalServerErrorException(erorr);
    }
  }

  //
  //

  async getFavService(
    _id: string,
    page_number: number,
    page_size: number,
    toSearch: string,
  ) {
    return this.favouriteService.getFavouriteByIdClient(
      _id,
      page_number,
      page_size,
      toSearch,
    );
  }

  async globalSearchService(
    user: UserToken,
    page_number: number,
    page_size: number,
    toSearch: string,
    // accepte !this one
  ) {
    console.log(toSearch);
    var mongoose = require('mongoose');
    var castedUserId = mongoose.Types.ObjectId(user._id);
    switch (user.role) {
      case privilege.CLIENT: {
        const userLength = (
          await this.userModel.aggregate([
            {
              $lookup: {
                from: 'companies',
                localField: 'relatedCompany',
                foreignField: '_id',
                as: 'relatedCompany',
              },
            },

            {
              $unwind: {
                path: '$relatedCompany',
                preserveNullAndEmptyArrays: true,
              },
            },
            { $project: { 'relatedCompany.categories': 0 } },
            {
              $lookup: {
                from: 'prestations',
                localField: 'relatedCompany.prestations',
                foreignField: '_id',
                as: 'relatedCompany.prestations',
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'relatedCompany.employees',
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'relatedCompany.employees',
                foreignField: '_id',
                as: 'relatedCompany.employees',
              },
            },
            ...SUBSCRIPTION_CHECK,
            {
              $match: {
                $and: [
                  { type: privilege.PRO },
                  { addedByAdmin: false },
                  { configurationLevel: 12 },
                  ...SUBSECRIPTION_PAYMENT_CONDITION,
                  {
                    $or: [
                      {
                        firstName: {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        lastName: {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        'relatedCompany.companyName': {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        companyName: {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        'relatedCompany.job': {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        email: {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ])
        ).length;
        const resultUser = await this.userModel.aggregate([
          {
            $lookup: {
              from: 'companies',
              localField: 'relatedCompany',
              foreignField: '_id',
              as: 'relatedCompany',
            },
          },

          {
            $unwind: {
              path: '$relatedCompany',
              preserveNullAndEmptyArrays: true,
            },
          },
          { $project: { 'relatedCompany.categories': 0 } },
          {
            $lookup: {
              from: 'prestations',
              localField: 'relatedCompany.prestations',
              foreignField: '_id',
              as: 'relatedCompany.prestations',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'relatedCompany.employees',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'relatedCompany.employees',
              foreignField: '_id',
              as: 'relatedCompany.employees',
            },
          },
          ...SUBSCRIPTION_CHECK,
          {
            $match: {
              $and: [
                { type: privilege.PRO },
                { addedByAdmin: false },
                { configurationLevel: 12 },
                ...SUBSECRIPTION_PAYMENT_CONDITION,
                {
                  $or: [
                    {
                      firstName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      lastName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.companyName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'relatedCompany.job': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      email: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * page_size : 0,
          },
          { $limit: page_number && page_size ? +page_size : 10 },
          { $sort: { firstName: 1 } },
        ]);

        // resultUser.map(async (userPro: User) => {
        //   /// userPro.quotations =await this.quotationService.getSpecifiquotation(userClient._id,userPro._id)
        // });

        const resultForUsers = await Promise.all(
          resultUser.map(async (userPro: User) => {
            // console.log(user.relatedCompany);
            //  console.log(userPro._id, user._id);
            if (
              await this.favouriteService.getFavouritesByClientToPro(
                user._id,
                userPro._id,
              )
              //!.length > 0
            ) {
              userPro.isFav = true;

              //  return userPro;
            } else {
              userPro.isFav = false;
            }
            return userPro;
          }),
        );
        //    console.log(resultForUsers);
        //todo search for proBo
        const proBo = await this.userModel
          .find({
            $and: [
              { type: privilege.PRO },
              { addedByAdmin: true },
              {
                $or: [
                  {
                    firstName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    lastName: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    email: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          })
          .sort({ firstName: 1 })
          .skip(page_number && page_size ? (+page_number - 1) * page_size : 0)
          .limit(page_number && page_size ? page_size : 10)
          .lean();

        const proBolength = (
          await this.userModel
            .find({
              $and: [
                { type: privilege.PRO },
                { addedByAdmin: true },
                {
                  $or: [
                    {
                      firstName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      lastName: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      email: {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            })
            .sort({ firstName: 1 })
            .allowDiskUse(true)
        ).length;
        //todo search for quotations Client
        const { quotations, quotationsLength } =
          await this.quotationService.getProQuotations(
            user._id,
            toSearch,
            page_number,
            page_size,
          );

        //todo search for appointment Client
        const appointments =
          await this.appointmentService.findMyAppointmentsWaleed(
            page_size,
            page_number,
            user,
            toSearch,
          );
        //todo search for events Client
        const events = await this.eventService.fetchMyEvents(
          page_size,
          page_number,
          toSearch,
          user,
        );

        const { invoice_data, total } =
          await this.walletService.fetchSubInvoiceForGlobalSearchClient(
            page_size,
            page_number,
            toSearch,
            user,
          );
        const totalforPaginationWeb = findMax(
          total,
          userLength,
          proBolength,
          quotationsLength,
          Number(appointments.total_appointments),
          Number(events.total_attributs_events),
        );

        const resultLength =
          total +
          userLength +
          proBolength +
          quotationsLength +
          Number(appointments.total_appointments) +
          Number(events.total_attributs_events);
        const totalforPagination = findMax(
          userLength,
          proBolength,
          quotationsLength,
          Number(appointments.total_appointments),
          Number(events.total_attributs_events),
        );
        return {
          statusCode: 200,
          message: 'API_result',
          data: {
            client: null,
            pro: resultForUsers,
            proBo: proBo,
            quotations: quotations,
            appointment: appointments.data,
            factures: {
              appointment_data: null,
              sub_data: null,
              event_data: null,
              eventPack_data: null,
              client_fac_data: invoice_data,
            },
            events: events.data,
          },
          page_number: page_number,
          page_size,
          total_result: resultLength,
          totalforPagination,
          totalforPaginationWeb,
        };
      }
      case privilege.PRO: {
        //todo pro et probo
        //todo from here ....
        console.log('from pro');
        const myclient = await this.relationshipsModel.aggregate([
          {
            $lookup: {
              from: 'users',
              localField: '_idclientInMyNetwork',
              foreignField: '_id',
              as: '_idclientInMyNetwork',
            },
          },

          {
            $unwind: {
              path: '$_idclientInMyNetwork',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              $and: [
                { proId: new mongoose.Types.ObjectId(user._id) },
                { type: 'CLIENTSHIP' },
                {
                  $or: [
                    {
                      '_idclientInMyNetwork.firstName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      '_idclientInMyNetwork.lastName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      '_idclientInMyNetwork.email': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            },
          },
          { $project: { _idclientInMyNetwork: 1, _id: 0 } },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * page_size : 0,
          },
          { $limit: page_number && page_size ? +page_size : 10 },
          { $sort: { createdAt: -1 } },
        ]);


        const client = myclient.map(clt => clt._idclientInMyNetwork)
        const clientLenght = (
          await this.relationshipsModel.aggregate([
            {
              $lookup: {
                from: 'users',
                localField: '_idclientInMyNetwork',
                foreignField: '_id',
                as: '_idclientInMyNetwork',
              },
            },

            {
              $unwind: {
                path: '$_idclientInMyNetwork',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: {
                $and: [
                  { proId: new mongoose.Types.ObjectId(user._id) },
                  { type: 'CLIENTSHIP' },
                  {
                    $or: [
                      {
                        '_idclientInMyNetwork.firstName': {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        '_idclientInMyNetwork.lastName': {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                      {
                        '_idclientInMyNetwork.email': {
                          $regex: new RegExp(`${toSearch}`),
                          $options: 'i',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ])
        ).length;


        // const client = await this.userModel
        //   .find({
        //     $and: [
        //       { type: privilege.CLIENT },
        //       { active: true },
        //       {
        //         $or: [
        //           {
        //             firstName: {
        //               $regex: new RegExp(`${toSearch}`),
        //               $options: 'i',
        //             },
        //           },
        //           {
        //             lastName: {
        //               $regex: new RegExp(`${toSearch}`),
        //               $options: 'i',
        //             },
        //           },
        //           {
        //             email: {
        //               $regex: new RegExp(`${toSearch}`),
        //               $options: 'i',
        //             },
        //           },
        //         ],
        //       },
        //     ],
        //   })
        //   .sort({ firstName: 1 })
        //   .skip(page_number && page_size ? (+page_number - 1) * page_size : 0)
        //   .limit(page_number && page_size ? page_size : 10)
        //   .lean();

        // const clientLenght =
        //   await this.userModel.find({
        //     $and: [
        //       { type: privilege.CLIENT },
        //       { active: true },
        //       {
        //         $or: [
        //           {
        //             firstName: {
        //               $regex: new RegExp(`${toSearch}`),
        //               $options: 'i',
        //             },
        //           },
        //           {
        //             lastName: {
        //               $regex: new RegExp(`${toSearch}`),
        //               $options: 'i',
        //             },
        //           },
        //           {
        //             email: {
        //               $regex: new RegExp(`${toSearch}`),
        //               $options: 'i',
        //             },
        //           },
        //         ],
        //       },
        //     ],
        //   })
        //     .count();
        //todo search for appointment
        const appointments =
          await this.appointmentService.findMyAppointmentsWaleed(
            page_size,
            page_number,
            user,
            toSearch,
          );
        //todo search for events
        const events = await this.eventService.fetchMyEvents(
          page_size,
          page_number,
          toSearch,
          user,
        );

        console.log('1');

        const { quotations, quotationsLength } =
          await this.quotationService.getClientQuotations(
            user._id,
            page_number,
            page_size,
            toSearch,
          );

        const { fac_data, fac_length } =
          await this.walletService.fetchSubInvoiceForGlobalSearchPro(
            page_size,
            page_number,
            toSearch,
            user,
          );
        const totalforPaginationWeb = findMax(
          clientLenght,
          fac_length,
          quotationsLength,
          Number(appointments.total_appointments),
          Number(events.total_attributs_events),
        );

        console.log('toSearchtoSearch', toSearch);

        const resultLength =
          clientLenght +
          quotationsLength +
          Number(appointments.total_appointments) +
          Number(events.total_attributs_events);

        const totalforPagination = findMax(
          clientLenght,
          fac_length,
          quotationsLength,
          Number(appointments.total_appointments),
          Number(events.total_attributs_events),
        );

        Number(events.total_attributs_events) + Number(fac_length);
        return {
          statusCode: 200,
          message: 'API_result',
          data: {
            pro: null,
            client: client,
            proBo: null,
            quotations: quotations,
            appointment: appointments.data,
            factures: { ...fac_data },
            events: events.data,
          },
          page_number: page_number,
          page_size: page_size,
          total_result: resultLength,
          totalforPagination,
          totalforPaginationWeb,
        };
      }
      case privilege.EMPLOYEE: {
        console.log('from emp');

        const myClientByAppointment =
          await this.appointmentService.getClientByAssignedEmployee(
            user._id,
            toSearch,
            page_number,
            page_size,
          );

        // //todo search for appointment

        // //todo search for events

        const resultLength =
          Number(myClientByAppointment.appointlength) +
          Number(myClientByAppointment.clientlength);
        //
        const totalforPagination = findMax(
          Number(myClientByAppointment.appointlength),
          Number(myClientByAppointment.clientlength),
        );
        return {
          statusCode: 200,
          message: 'API_result',
          data: {
            client: myClientByAppointment.clientOnly,
            appointment: myClientByAppointment.appointment,
            factures: null,
            pro: null,
            proBo: null,
            quotations: null,
            events: null,
          },
          page_number: page_number,
          page_size: page_size,
          total_result: resultLength,
          totalforPagination,
        };
      }
    }
  }

  async findAll(query, page_size, page_number) {
    return this.userModel
      .find(query)
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10)
      .lean();
  }

  async welcomeScreen(user: UserToken) {
    /* fetch next appointment */
    const dataUser = await this.userModel.findOne({ _id: user._id });
    const next_appointment = await this.appointmentService.fetchNextAppointment(
      user,
    );
    /* fetch next appointment request */
    const next_appointment_request =
      await this.appointmentService.fetchNextAppointmentRequest(user);
    /* fetch next event*/
    let next_event = await this.eventService.fetchNextEvent(user);
    return {
      statusCode: 200,
      message: 'API.SCREEN_FETCHED',
      data: [
        { appointment: next_appointment },
        { appointment_request: next_appointment_request },
        {
          event: next_event,
          available_event: dataUser.available_events
            ? dataUser.available_events
            : 0,
        },
      ],
    };
  }

  async countUsers(query) {
    return await this.userModel.count(query);
  }
  //!  - - - - - - SPRINT 3- - - - - - - - SPRINT 3 - - - - - - SPRINT 3- - - - - - - - SPRINT 3 - - - - - - SPRINT 3- - - - - - - - SPRINT 3 - - - - - - SPRINT 3- - - - - - - - SPRINT 3
  async editProfile(userId: string, attributes: EditProfilDto) {
    if (attributes.image) {
      const { Location } = await this.filesService.uploadFile(
        attributes.image.buffer,
        generateRereferralCode(15) + Date.now(),
      );
      //  console.log(Location);
      await this.updateServices(userId, {
        profileImage: Location.split('com/')[1],
        ...attributes,
      });
      const newUser = await this.userModel
        .findOne({ _id: userId }, { relatedCompany: 0, subscription: 0 })
        .populate('userAgenda');
      return apiReturner(HttpStatus.CREATED, SUCCEEDED, newUser);
    } else {
      // console.log('here2', attributes);
      const u = await this.updateServices(userId, {
        ...attributes,
      });
      const newUser = await this.userModel
        .findOne({ _id: userId }, { relatedCompany: 0, subscription: 0 })
        .populate('userAgenda');
      return apiReturner(HttpStatus.CREATED, SUCCEEDED, newUser);
    }
  }

  async getProNetwork(user: UserToken, page_number: number, page_size: number) {
    const relations = await this.relationshipsModel
      .find({
        proId: user._id,
        type: relationships.REFERRALSHIP,
      })
      .populate({
        path: '_idProInMyNetwork',
        select: 'firstName lastName relatedCompany referralLeadsCodeLink',
        populate: {
          path: 'relatedCompany',
          select: '_id companyName companyLogo',
        },
      })
      .sort({ firstName: 1 })
      .skip(page_number && page_size ? (+page_number - 1) * page_size : 0)
      .limit(page_number && page_size ? page_size : 10)
      .allowDiskUse(true)
      .lean();
    const relationslenght = (
      await this.relationshipsModel
        .find({
          proId: user._id,
          type: relationships.REFERRALSHIP,
        })
        .lean()
    ).length;
    return apiReturner(HttpStatus.OK, SUCCEEDED, {
      relations,
      page_number,
      page_size: page_size,
      total_relationships: relationslenght,
    });
  }

  //
  //
  //
  //
  //
  async getProClients(
    user: UserToken,
    page_number: number,
    page_size: number,
    toSearch: string,
    year: string,
    exportype?: boolean,
  ) {
    toSearch = toSearch != null || toSearch != undefined ? toSearch : '';

    if (exportype == true) {
      const inBetweenQuery = {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31T22:59:00.000Z`),
        },
      };
      //  console.log(inBetweenQuery);

      const relations = await this.relationshipsModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: '_idclientInMyNetwork',
            foreignField: '_id',
            as: '_idclientInMyNetwork',
          },
        },
        { $unwind: { path: '$_idclientInMyNetwork' } },
        {
          $match: {
            $and: [
              inBetweenQuery,
              { type: relationships.CLIENTSHIP },
              //@ts-ignore
              { proId: new mongoose.Types.ObjectId(user._id) },
              {
                $or: [
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            '$_idclientInMyNetwork.lastName',
                            ' ',
                            '$_idclientInMyNetwork.firstName',
                          ],
                        },
                        regex: new RegExp(`${toSearch}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ['$_idclientInMyNetwork.lastName', ' '],
                        },
                        regex: new RegExp(`${toSearch}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ['$_idclientInMyNetwork.firstName', ' '],
                        },
                        regex: new RegExp(`${toSearch}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            '$_idclientInMyNetwork.firstName',
                            ' ',
                            '$_idclientInMyNetwork.lastName',
                          ],
                        },
                        regex: new RegExp(`${toSearch}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    '_idclientInMyNetwork.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    '_idclientInMyNetwork.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
        },
        { $limit: page_number && page_size ? +page_size : 10 },
        { $sort: { createdAt: -1 } },
      ]);
      const relationslenght = (
        await this.relationshipsModel.aggregate([
          {
            $lookup: {
              from: 'users',
              localField: '_idclientInMyNetwork',
              foreignField: '_id',
              as: '_idclientInMyNetwork',
            },
          },
          { $unwind: { path: '$_idclientInMyNetwork' } },
          {
            $match: {
              $and: [
                inBetweenQuery,
                { type: relationships.CLIENTSHIP },
                //@ts-ignore
                { proId: new mongoose.Types.ObjectId(user._id) },
                {
                  $or: [
                    {
                      $expr: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              '$_idclientInMyNetwork.lastName',
                              ' ',
                              '$_idclientInMyNetwork.firstName',
                            ],
                          },
                          regex: new RegExp(`${toSearch}`),
                          options: 'i',
                        },
                      },
                    },
                    {
                      $expr: {
                        $regexMatch: {
                          input: {
                            $concat: ['$_idclientInMyNetwork.lastName', ' '],
                          },
                          regex: new RegExp(`${toSearch}`),
                          options: 'i',
                        },
                      },
                    },
                    {
                      $expr: {
                        $regexMatch: {
                          input: {
                            $concat: ['$_idclientInMyNetwork.firstName', ' '],
                          },
                          regex: new RegExp(`${toSearch}`),
                          options: 'i',
                        },
                      },
                    },
                    {
                      $expr: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              '$_idclientInMyNetwork.firstName',
                              ' ',
                              '$_idclientInMyNetwork.lastName',
                            ],
                          },
                          regex: new RegExp(`${toSearch}`),
                          options: 'i',
                        },
                      },
                    },
                    {
                      '_idclientInMyNetwork.firstName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      '_idclientInMyNetwork.lastName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            },
          },
        ])
      ).length;
      return apiReturner(HttpStatus.OK, SUCCEEDED, {
        relations,
        page_number,
        total_relationships: relationslenght,
      });
    } else {
      const relations = await this.relationshipsModel
        .find({
          proId: user._id,
          type: relationships.CLIENTSHIP,
        })
        .populate({
          path: '_idclientInMyNetwork',
          select: ' firstName lastName profileImage referralLeadsCodeLink',
        })
        .sort({ firstName: 1 })
        .skip(page_number && page_size ? (+page_number - 1) * page_size : 0)
        .limit(page_number && page_size ? page_size : 10)
        .allowDiskUse(true)
        .lean();
      const relationslenght = (
        await this.relationshipsModel
          .find({
            proId: user._id,
            type: relationships.CLIENTSHIP,
          })
          .lean()
      ).length;
      return apiReturner(HttpStatus.OK, SUCCEEDED, {
        relations,
        page_number,
        total_relationships: relationslenght,
      });
    }
  }
  async createRefferring(userId: string, email: string) {
    const referred = await this.referredsModel.create({
      userId: userId,
      AlreadyReferredEmail: email,
    });
    return referred;
  }

  async isRefferring(userId: string, email: string) {
    const referred = await this.referredsModel.findOne({
      userId: userId,
      AlreadyReferredEmail: email,
    });
    return referred ? true : false;
  }

  async userGetRatingService(
    from: UserToken,
    to: string,
    ratingPayload: RatingDto,
  ) {


    try {
      //
      //1
      //
      if (
        (await this.userModel.findOne({ _id: from })).type ==
        (await this.userModel.findOne({ _id: to })).type
      ) {
        throw new Error(
          'BAD_REQUEST , Invalid rating! you can not rate users have the same account type',
        );
      }

      //
      //2
      //
      let ratingDirec: string;
      const { type } = await this.userModel.findOne({ _id: to });
      switch (type) {
        case privilege.PRO:
          ratingDirec = ratingDirection.ClientToPro;
          break;
        case privilege.EMPLOYEE:
          ratingDirec = ratingDirection.ClientToEmp;
          break;
        case privilege.CLIENT:
          if (
            (await this.userModel.findOne({ _id: from })).type == privilege.PRO
          ) {
            ratingDirec = ratingDirection.ProToClient;
          } else {
            ratingDirec = ratingDirection.EmpToClient;
          }
          break;
      }
      //
      //
      //
      console.log(from._id, to, ratingDirec);

      //
      //3
      //
      let rateObject;
      const data = await this.appointmentService.findOne(
        ratingPayload.appointementId,
      );
      if (data.appointmentInstance) {
        rateObject = {
          from: from._id,
          to,
          type: ratingDirec,
          appointmentId: data.appointmentInstance,
        };
      } else {
        rateObject = {
          from: from._id,
          to,
          type: ratingDirec,
          appointmentId: data._id,
        };
      }
      //
      //4
      //
      console.log(rateObject);

      // if (
      //   await this.ratingModel.findOne({
      //     from: rateObject.from,
      //     to: rateObject.to,
      //     type: rateObject.type,
      //     appointementOrInstanceId: rateObject.appointmentId,
      //   })
      // ) {
      //   throw new Error(
      //     'BAD_REQUEST , you have already rated! thos appointment',
      //   );
      // } else {
      await this.ratingModel.findOneAndUpdate(
        {
          from: rateObject.from,
          to: rateObject.to,
          value: ratingPayload.value,
          comment: ratingPayload.comment,
          type: rateObject.type,
          appointementOrInstanceId: rateObject.appointmentId,
        },
        {
          from: rateObject.from,
          to: rateObject.to,
          value: ratingPayload.value,
          comment: ratingPayload.comment,
          type: rateObject.type,
          appointementOrInstanceId: rateObject.appointmentId,
        },
        { upsert: true, new: true },
      );
      const { ratingNote, totalRating, shownStarsNumber } =
        await this.calculateUserRatingNote2(to, ratingPayload.value);
      console.log('hero is here', ratingNote);

      await this.userModel.updateOne(
        {
          _id: to,
        },
        {
          rating: {
            ratingNote: parseFloat(ratingNote.toString()),
            totalRating,
            shownStarsNumber: parseFloat(shownStarsNumber.toString()),
          },
        },
      );
      const fromR = await this.userModel
        .findOne({ _id: from })
        .populate('relatedCompany');
      const toR = await this.userModel.findOne({ _id: to });
      if (fromR.type == privilege.EMPLOYEE) {
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.RATING,
            firstName: fromR.relatedCompany.companyName,
            badge: await this.notificationService.badge(toR._id),
            companyName: fromR.companyName,
          }),
          notification: RATING_FROM(
            await this.notificationService.badge(toR._id),
          ),
        };

        await onNotify(fromR, toR, this.notificationService, message);
      } else {
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.RATING,
            firstName: fromR.firstName,
            badge: await this.notificationService.badge(toR._id),
            lastName: fromR.lastName,
            companyName: fromR.companyName,
          }),

          notification: RATING_FROM(
            await this.notificationService.badge(toR._id),
          ),
        };

        await onNotify(fromR, toR, this.notificationService, message);
      }

      // await onNotify(
      //   ToFromQuo.data.to,
      //   ToFromQuo.data.from,
      //   this.notificationService,
      //   message,
      // );
      // let message: NotificationMessage = {
      //   data: {
      //     firstName: fromR.firstName,
      //     lastName: fromR.lastName,
      //   },
      //   notification: RATING_FROM(fromR.firstName, fromR.lastName),
      // };
      return apiReturner(HttpStatus.OK, SUCCEEDED);
      //}
    } catch (e) {
      Exceptionlookup(e);
      throw new HttpException(
        SOMETHING_WENT_WRONG + ': ' + e.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUserRatingService(
    userId: string,
    page_number: number,
    page_size: number,
  ) {
    try {
      let usersRatings = [];
      const { rating } = await this.userModel.findOne({ _id: userId });
      const ratingListTotal = (
        await this.ratingModel
          .find({ to: userId, flagedByAdmin: false }, { flagedByAdmin: 0 })
          .populate([
            {
              path: 'to',
              populate: ['relatedCompany', 'userAgenda'],
              // {
              //   path: 'relatedCompany',
              //   populate: { path: 'userAgenda' },
              // },
            },
            {
              path: 'from',
              populate: ['relatedCompany', 'userAgenda'],
              // {
              //   path: 'relatedCompany',
              //   populate: { path: 'userAgenda' },
              // },
            },
          ])
      ).length;
      const ratingList = await this.ratingModel
        .find({ to: userId, flagedByAdmin: false }, { flagedByAdmin: 0 })
        .populate([
          {
            path: 'to',
            populate: ['relatedCompany', 'userAgenda'],
            // {
            //   path: 'relatedCompany',
            //   populate: { path: 'userAgenda' },
            // },
          },
          {
            path: 'from',
            populate: ['relatedCompany', 'userAgenda'],
            // {
            //   path: 'relatedCompany',
            //   populate: { path: 'userAgenda' },
            // },
          },
        ])
        .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
        .limit(page_number && page_size ? +page_size : 10);

      return apiReturner(HttpStatus.OK, SUCCEEDED, {
        rate: rating,
        ratingList,
        ratingListTotal,
        page_number,
        page_size,
      });
    } catch (e) {
      Exceptionlookup(e);
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }
  }
  async calculateUserRatingNote(userId: string) {
    try {
      let usersRatings = [];
      (await this.ratingModel.find({ to: userId })).map((data) =>
        usersRatings.push(data.value),
      );
      const { ratingNote, totalRating } = onRating(usersRatings);
      return { ratingNote, totalRating };
    } catch (e) {
      Exceptionlookup(e);
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }
  }
  async calculateUserRatingNote2(userId: string, newRating?: number) {
    try {
      const { rating } = await this.userModel.findOne({ _id: userId });
      const { ratingNote, totalRating, shownStarsNumber } = onRatingv2(
        newRating,
        rating,
      );
      let starts = '';
      for (let i = 0; i < (shownStarsNumber | 0); i++) {
        starts = starts + '⭐';
      }
      console.log(
        ratingNote,
        '(',
        totalRating,
        ')',
        '==>',
        shownStarsNumber,
        starts,
      );
      return { ratingNote, totalRating, shownStarsNumber };
      //}
    } catch (e) {
      Exceptionlookup(e);
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }
  }

  async createExternalUser(data) {
    return this.userModel.findOneAndUpdate(data, data, {
      upsert: true,
      new: true,
    });
  }

  async updateAvailabilty(user, available) {
    const diEmp = await this.userModel
      .findOneAndUpdate({ _id: user._id }, { available }, { new: true })
      .populate({ path: 'relatedCompany' });
    console.log(typeof available);

    if (available == 'false') {
      console.log(diEmp.relatedCompany.reletedTo);

      const notifTarget = await this.userModel.findOne({
        _id: diEmp.relatedCompany.reletedTo,
      });
      if (diEmp.type == privilege.EMPLOYEE) {
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.UNAVAILABLE_EMPLOYEE,
            firstName: diEmp.firstName,
            lastName: diEmp.lastName,
            badge: await this.notificationService.badge(notifTarget._id),
          }),
  
          notification: UNAVAILABLE_EMPLOYEE(
            await this.notificationService.badge(notifTarget._id),
          ),
        };
  
        await onNotify(diEmp, notifTarget, this.notificationService, message);
      }
}
  

    return {
      statusCode: 200,
      message: 'API.USER_UPDATED',
      data: [],
    };
  }

  async updateUserAgendaConfig(user, data) {
    /* create agenda user */
    let { hours } = data;
    for (let i = 0; i < hours?.length; i++) {
      if (!hours[i]) continue;
      hours[i].day_from_hours = new Date(`1 1,2001 ${hours[i].day_from_hours}`);
      hours[i].day_to_hours = new Date(`1 1,2001 ${hours[i].day_to_hours}`);
      hours[i].mid_day_from_hours = new Date(
        `1 1,2001 ${hours[i].mid_day_from_hours}`,
      );
      hours[i].mid_day_to_hours = new Date(
        `1 1,2001 ${hours[i].mid_day_to_hours}`,
      );
    }
    if (user.role == 'PRO') {
      await this.campanyService.updateCompany(user._id, data);
    }
    const agenda_user = await this.agendaUser.findOneAndUpdate(
      { user_id: user._id },
      data,
      { upsert: true, new: true },
    );

    /* add the instance to the user */
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      { userAgenda: agenda_user._id },
    );
    return {
      statusCode: 200,
      message: 'API.USER_UPDATED',
      data: [],
    };
  }

  async searchUsersWithAggregate(query) {
    return this.relationshipsModel.aggregate(query);
  }

  async referralCodeSenderService(user: User, emails: referralCodeSenderDto) {
    try {
      let emailToSend: string[] = [];

      const thisUser = await this.userModel.findOne({ _id: user._id });
      await Promise.all(
        emails.emails.map(async (email) => {
          const isExist = await this.userModel.findOne({ email: email });
          //! if already Referred
          //todo wil change
          console.log(
            isExist == null && (await this.isRefferring(user._id, email)),
          );
          if (isExist == null && !(await this.isRefferring(user._id, email))) {
            await this.createRefferring(user._id, email);
            console.log('added ');
            emailToSend.push(email);
          } else {
            console.log(email, 'already exist! or already referred!');
          }
        }),
      );
      console.log('emmtosend');
      //  console.log(emailToSend);
      const shortLinkWeb =
        process.env.F_URL +
        'inscription/professionel?Code=' +
        thisUser.referralCode;
      if (emailToSend.length > 0) {
        await this.mailService.sendEmailForReferralCode(
          emailToSend,
          thisUser.referralCodeLink,
          shortLinkWeb,
          thisUser.referralCode,
        );
      }
    } catch (e) {
      Exceptionlookup(e);
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG, e);
    }
    return apiReturner(HttpStatus.CREATED, SUCCEEDED);
  }

  async ProClients(proDto: ProDto) {
    try {
      let clients = await this.relationshipsModel
        .find({ proId: proDto.proId, type: 'CLIENTSHIP' })
        .populate(['proId', '_idclientInMyNetwork']);
      return {
        statusCode: 200,
        message: 'API.PRO.CLIENTS.FETCHED',
        data: clients,
        total: clients.length,
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG, e);
    }
  }

  async getUserById(_id: string) {
    try {
      console.log('hiiiiiiiiiiiiiiiiiis', _id);

      const { type } = await this.findUserBy({ _id });
      var mongoose = require('mongoose');
      let pipeline = [];
      if (type == privilege.PRO) {
        pipeline = [
          {
            $lookup: {
              from: 'subscriptions',
              localField: 'subscription',
              foreignField: '_id',
              as: 'subscription',
            },
          },
          {
            $unwind: {
              path: '$subscription',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'companies',
              localField: 'relatedCompany',
              foreignField: '_id',
              as: 'relatedCompany',
            },
          },
          {
            $unwind: {
              path: '$relatedCompany',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'relatedCompany.employees',
              foreignField: '_id',
              as: 'relatedCompany.employees',
            },
          },
          {
            $lookup: {
              from: 'prestations',
              localField: 'relatedCompany.prestations',
              foreignField: '_id',
              as: 'relatedCompany.prestations',
            },
          },
          {
            $lookup: {
              from: 'categories',
              localField: 'relatedCompany.categories',
              foreignField: '_id',
              as: 'relatedCompany.categories',
            },
          },
          {
            $match: {
              $and: [{ _id: mongoose.Types.ObjectId(_id) }],
            },
          },
        ];
      } else {
        pipeline = [
          {
            $lookup: {
              from: 'subscriptions',
              localField: 'subscription',
              foreignField: '_id',
              as: 'subscription',
            },
          },
          {
            $unwind: {
              path: '$subscription',
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $match: {
              $and: [{ _id: mongoose.Types.ObjectId(_id) }],
            },
          },
        ];
      }
      //    console.log(pipeline);
      //
      //

      const user = await this.userModel.aggregate([...pipeline]);
      console.log(user.length);
      return apiReturner(HttpStatus.CREATED, SUCCEEDED, user[0]);
    } catch (e) {
      throw new HttpException('', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async configNotifications(user: UserToken, newConfig: ConfigNotifications) {
    const isDone = await this.userModel.findOneAndUpdate(
      { _id: user._id },
      { ...newConfig },
    );
    if (isDone) {
      return true;
    } else {
      return false;
    }
  }
  async userConfigNotifService(user: UserToken) {
    switch (user.role) {
      case privilege.CLIENT: {
        const {
          c_notif_for_appointemnt_accepted,
          a_notif_before_appointment,
          a_notif_new_rating,
          a_notif_prestation_finished,
          pc_notif_posp_or_dec_appointment,
          c_notif_begin_event_soon,
        } = await this.userModel.findOne({ _id: user._id });
        return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
          c_notif_for_appointemnt_accepted,
          a_notif_before_appointment,
          a_notif_new_rating,
          a_notif_prestation_finished,
          pc_notif_posp_or_dec_appointment,
          c_notif_begin_event_soon,
        });
      }
      case privilege.EMPLOYEE: {
        const {
          ep_notif_ask_for_demande,
          a_notif_before_appointment,
          a_notif_new_rating,
          a_notif_prestation_finished,
        } = await this.userModel.findOne({ _id: user._id });
        return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
          ep_notif_ask_for_demande,
          a_notif_before_appointment,
          a_notif_new_rating,
          a_notif_prestation_finished,
        });
      }
      case privilege.PRO: {
        const {
          ep_notif_ask_for_demande,
          a_notif_before_appointment,
          a_notif_new_rating,
          a_notif_prestation_finished,
          p_notif_payment,
          pc_notif_posp_or_dec_appointment,
          p_notif_new_event_signup,
        } = await this.userModel.findOne({ _id: user._id });
        return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
          ep_notif_ask_for_demande,
          a_notif_before_appointment,
          a_notif_new_rating,
          a_notif_prestation_finished,
          p_notif_payment,
          pc_notif_posp_or_dec_appointment,
          p_notif_new_event_signup,
        });
      }
    }
  }

  async fetchCompanyEmployees(companyId, user) {
    const campanyEmp = await this.campanyService.fetchCompanyEmployeesService(
      companyId,
    );
    // console.log(campanyEmp);
    // const users_data = await this.userModel
    //   .find({
    //     relatedCompany: companyId,
    //     configurationLevel:{$gte:2
    //     },
    //     active:true
    //   })
    //   .populate('userAgenda');

    return {
      statusCode: 200,
      message: 'API.EMPLOYEE_COMPANY_FETCHED',
      data: campanyEmp['listeOfEmp'],
      CompanyLogo: campanyEmp['companyLogo'],
    };
  }

  async fetchCompanyEmployeesDispo(companyId, user) {
    const campanyEmp =
      await this.campanyService.fetchCompanyEmployeesWithDispoService(
        companyId,
      );
    // console.log(campanyEmp);
    // const users_data = await this.userModel
    //   .find({
    //     relatedCompany: companyId,
    //     configurationLevel:{$gte:2
    //     },
    //     active:true
    //   })
    //   .populate('userAgenda');

    return {
      statusCode: 200,
      message: 'API.EMPLOYEE_COMPANY_FETCHED',
      data: campanyEmp['listeOfEmp'],
      CompanyLogo: campanyEmp['companyLogo'],
    };
  }

  //!from Walid :✂️- - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - -
  async exportTransferService(me: UserToken, month: number, year: number) {
    return await this.quotationService.exportTransferService(me, month, year);
  }
  async exportQuotationService(
    user: UserToken,
    month: number,
    year: number,
    type: quotationsType,
    pagination: { page_number: number; page_size: number },
    toSearch?: string,
  ) {
    return this.quotationService.exportQuotationService(
      user,
      month,
      year,
      type,
      pagination,
      toSearch,
    );
  }
  async exportClient(meId: String, id: string) {
    try {
      const fs = require('fs');
      var dir = './tmp/';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      // Create an object with some
      const { firstName, lastName, email, phoneNumber, city, rating } =
        await this.userModel.findOne({ _id: id });
      const ratingNote = !rating ? 0 : rating.ratingNote;
      const data = {
        Prénon: firstName,
        Nom: lastName,
        email,
        Telephone: phoneNumber,
        Ville: city,
        Avis: ratingNote,
      };
      // Convert the object to a CSV string
      const csv2 = convertToCSV([data]);

      fs.writeFileSync(dir + 'test.csv', csv2, 'utf8');

      /**************************************** */

      /***************************************** */
      const filename = firstName + '_' + lastName + id + '.csv';

      console.log('Finished writing data');
      const { Location } = await this.filesService.uploadCsvFileStrem(filename);
      //  console.log(Location);
      fs.unlink(dir + 'test.csv', (err) => {
        if (err) throw err;
        console.log('file deleted');
      });
      return { url: Location };
    } catch (e) {
      throw new HttpException(
        SOMETHING_WENT_WRONG,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  catch(e) {
    // Exceptionlookup(e);
    console.log(e);
    console.log(e);

    throw new HttpException(
      SOMETHING_WENT_WRONG,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  //
  //
  //
  //

  getFilesInDirectory(filename: any) {
    console.log('\nFiles present in directory:');
    let files = fs.readdirSync(filename);
    files.forEach((file) => {
      //  console.log(file);
    });
  }
  //
  //
  async fetchEmployeeAgenda(user, employeeId) {
    return {
      statusCode: 200,
      message: 'API.FETCH_EMPLOYEE_AGENDA',
      data: await this.agendaUser.findOne({ user_id: employeeId }),
    };
  }

  async fetchRatingWithFilter(filter) {
    return await this.ratingModel.find(filter);
  }
  async fetchRating(fetchRatingDto: fetchRatingDto) {
    try {
      let { page_number, page_size, search } = fetchRatingDto;
      if (!search) search = '';

      // let allRating = await this.ratingModel.find({}).populate("from").populate("to").find({  })
      //   .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      //   .limit(page_number && page_size ? +page_size : 10);

      let allRating = await this.ratingModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: { path: '$to' } },
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: { path: '$from' } },
        {
          $match:
          {
            $and: [

              { 'from.active': true },
              { 'from.deleted': false },
              { 'to.active': true },
              { 'to.deleted': false },

              {
                $or: [
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ['$from.firstName', ' ', '$from.lastName'],
                        },
                        regex: new RegExp(`${search}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    'from.firstName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.lastName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.phoneNumber': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.email': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.firstName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.lastName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.phoneNumber': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.email': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ]
          }
        },
        { $sort: { updatedAt: -1 } },
        {
          $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0,
        },
        { $limit: page_number && page_size ? +page_size : 10 },
      ]);

      let total_rating = await this.ratingModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: { path: '$to' } },
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: { path: '$from' } },
        {
          $match:
          {
            $and: [

              { 'from.active': true },
              { 'from.deleted': false },
              { 'to.active': true },
              { 'to.deleted': false },

              {
                $or: [
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ['$from.firstName', ' ', '$from.lastName'],
                        },
                        regex: new RegExp(`${search}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    'from.firstName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.lastName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.phoneNumber': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.email': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.firstName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.lastName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.phoneNumber': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.email': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ]
          }
        },
      ]);

      // const total = await this.ratingModel.count({});
      return {
        statusCode: 200,
        message: 'API.FETCH.ALL.RATING',
        data: allRating,
        page_number,
        page_size,
        total_attributs: total_rating.length,
      };
    } catch (error) {
      console.log('fetchRating error :', error);

      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async deleteEmployee(user, employeeId) {
    /* fetch the user company */
    const user_data = await this.userModel.findOne({ _id: user._id });
    /* check if the employeed does not have an appointment */
    const appointment =
      await this.appointmentService.fetchAppointmentsWithQuery({
        start_date: { $gte: new Date().toISOString() },
        status: { $nin: ['Refused', 'Canceled'] },
        assigned_employees: {
          $elemMatch: {
            //@ts-ignore
            to: new mongoose.Types.ObjectId(employeeId),
          },
        },
      });
    if (appointment.length != 0) {
      throw new HttpException(
        'API.EMPLOYEE.ALREADY.TAKEN',
        HttpStatus.FORBIDDEN,
      );
    }
    await this.userModel.findOneAndUpdate(
      { _id: employeeId },
      { email: uuidv4() + '@mail.com', relatedCompany: null, active: false },
    );
    await this.campanyService.updateCompany(String(user._id), {
      //@ts-ignore
      $pull: { employees: new mongoose.Types.ObjectId(employeeId) },
    });
    return {
      statusCode: 200,
      message: 'API.EMPLOYEE.DELETED',
    };
  }

  async updateRating(fetchRatingDto: fetchRatingDto) {
    try {
      let updateRating = await this.ratingModel.findOneAndUpdate(
        { _id: fetchRatingDto.ratingId },
        { flagedByAdmin: fetchRatingDto.flagedByAdmin },
        { new: true },
      );
      return {
        statusCode: 202,
        message: 'API.UPDATE.ADMIN.RATING',
        data: updateRating,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async fetchProById(user, proId) {
    return {
      statusCode: 200,
      message: 'API.PRO.FETCHED',
      data: await this.userModel
        .findOne({ _id: proId })
        .populate({
          path: 'relatedCompany',
          populate: [
            { path: 'prestations' },
            { path: 'employees' },
            { path: 'categories' },
            { path: 'employees', populate: 'userAgenda' },
          ],
        })
        .populate('userAgenda'),
    };
  }
  async isJoinedService(user: UserToken, eventId: string) {
    return await this.eventService.isJoinedEventService(user, eventId);
  }
  async isRatingService(from: string, to: string, appointementId: string) {
    let type = '';
    let appointement;
    const data = await this.appointmentService.findOne(appointementId);
    if (data.appointmentInstance) {
      appointement = data.appointmentInstance;
    } else {
      appointement = appointementId;
    }
    const userFrom = await this.userModel.findOne({ _id: from });
    const userTo = await this.userModel.findOne({ _id: to });
    if (userFrom.type == privilege.PRO && userTo.type == privilege.CLIENT) {
      type = ratingDirection.ProToClient;
    }
    if (
      userFrom.type == privilege.CLIENT &&
      userTo.type == privilege.EMPLOYEE
    ) {
      type = ratingDirection.ClientToEmp;
    }
    if (userFrom.type == privilege.CLIENT && userTo.type == privilege.PRO) {
      type = ratingDirection.ClientToPro;
    }
    if (
      userFrom.type == privilege.EMPLOYEE &&
      userTo.type == privilege.CLIENT
    ) {
      type = ratingDirection.EmpToClient;
    }
    const rating = await this.ratingModel.findOne({
      from,
      to,
      // type: type,
      appointementOrInstanceId: appointement,
    });
    console.log(rating);
    if (rating) {
      return apiReturner(HttpStatus.OK);
    } else {
      throw new HttpException('', HttpStatus.NOT_FOUND);
    }
  }

  //!- - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - -
  async fetchProWithCategoryFilter(categoryId, page_size, page_number, search) {
    let query = { type: 'PRO' };
    if (!search) search = '';
    if (categoryId)
      //@ts-ignore
      query['relatedCompany.categories'] = new mongoose.Types.ObjectId(
        categoryId,
      );

    let pros = await this.userModel.aggregate([
      {
        $match: {
          deleted:false,
          $expr: {
            $regexMatch: {
              input: {
                $concat: ['$firstName', ' ', '$lastName'],
              },
              regex: new RegExp(`${search}`),
              options: 'i',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'relatedCompany',
          foreignField: '_id',
          as: 'relatedCompany',
        },
      },
      { $unwind: { path: '$relatedCompany' , preserveNullAndEmptyArrays:true } },
      { $match: query },
      { $sort: { firstName: 1 } },
      { $project: { password: 0 } },
      { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);

    const pros_size = await this.userModel.aggregate([
      {
        $match: {
          deleted:false,
          $expr: {
            $regexMatch: {
              input: {
                $concat: ['$firstName', ' ', '$lastName'],
              },
              regex: new RegExp(`${search}`),
              options: 'i',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'relatedCompany',
          foreignField: '_id',
          as: 'relatedCompany',
        },
      },
      {
        $unwind: { path: '$relatedCompany', preserveNullAndEmptyArrays: true },
      },
      { $match: query },
      { $sort: { firstName: 1 } },
    ]);

    pros = await this.categoryModel.populate(pros, {
      path: 'relatedCompany.categories',
      populate: { path: 'parentCategory' },
    });

    pros = await this.categoryModel.populate(pros, {
      path: 'suggestedSubCategory',
      populate: { path: 'parentCategory' },
    });

    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_FETCHED',
      data: pros,
      page_number,
      page_size,
      total_attributs: pros_size.length,
    };
  }
  async pokeListeAndNotify(toAnnu_id: string) {
    const whosPokeThisUserListe = await this.PockeModel.find({
      to: toAnnu_id,
    }).populate(['from', 'to']);
    if (whosPokeThisUserListe.length > 0) {
      whosPokeThisUserListe.map(async (pock) => {
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.PUBLIC_PRO_SIGNED_UP,
            firstName: pock.to.firstName,
            lastName: pock.to.lastName,
            badge: await this.notificationService.badge(pock.from._id),
          }),

          notification: PUBLIC_PRO_SIGNED_UP(
            await this.notificationService.badge(pock.from._id),
          ),
        };

        await onNotify(pock.to, pock.from, this.notificationService, message);

        // let message: NotificationMessage = {
        //   data: {},
        //   notification: PUBLIC_PRO_SIGNED_UP(),
        // };
        // await onNotify(pock.to, pock.from, this.notificationService, message);
      });
    } else {
      console.log('simple pro');
    }
  }
  async getProByEmployee(empId) {
    const { relatedCompany } = await this.userModel
      .findOne({ _id: empId })
      .populate({ path: 'relatedCompany', populate: { path: 'reletedTo' } });
    const pro: any = relatedCompany.reletedTo;
    if (pro) {
      return { pro, relatedCompany };
    } else {
      return null;
    }
  }

  async leadTransferNotify(me: string, idUser: string) {
    const whoShare = await this.userModel.findOne({ _id: me });
    const benificer = await this.userModel.findOne({ _id: idUser });
    console.log('bb', benificer, idUser);

    if (benificer.type == privilege.PRO) {
      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.SOMEONE_SHARED_YOUR_PROFILE_TO_PRO,
          badge: await this.notificationService.badge(benificer._id),
          firstName: whoShare.firstName,
          lastName: whoShare.lastName,
          companyName: whoShare.companyName,
          url: benificer.referralLeadsCodeLink,
        }),

        notification: SOMEONE_SHARED_YOUR_PROFILE_TO_PRO(
          await this.notificationService.badge(benificer._id),
        ),
      };
      await onNotify(whoShare, benificer, this.notificationService, message);
    } else if (benificer.type == privilege.CLIENT) {
      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.SOMEONE_SHARED_YOUR_PROFILE_TO_CLIENT,
          badge: await this.notificationService.badge(benificer._id),
          firstName: whoShare.firstName,
          lastName: whoShare.lastName,
          companyName: whoShare.companyName,
          url: benificer.referralLeadsCodeLink,
        }),

        notification: SOMEONE_SHARED_YOUR_PROFILE_TO_CLIENT(
          await this.notificationService.badge(benificer._id),
        ),
      };
      await onNotify(whoShare, benificer, this.notificationService, message);
      // let message: NotificationMessage = {
      //   data: {
      //     firstName: whoShare.firstName,
      //     lastName: whoShare.firstName,
      //     companyName: whoShare.companyName,
      //   },
      //   notification: SOMEONE_SHARED_YOUR_PROFILE_TO_CLIENT(
      //     whoShare.firstName,
      //     whoShare.firstName,
      //     whoShare.companyName,
      //   ),
      // };
      // await onNotify(whoShare, benificer, this.notificationService, message);
    } else {
      throw new HttpException(
        SOMETHING_WENT_WRONG,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async fetchAllUsersStats() {
    try {
      let users;
      let nb_client = await this.userModel.find({ type: 'CLIENT',  deleted: false });
      let nb_employee = await this.userModel.find({ type: 'EMPLOYEE',  deleted: false });
      let nb_pro = await this.userModel.find({ type: 'PRO',  deleted: false });
      let nb_company = await this.companyModel.find();
      let nb_events = await this.eventsModel.find();
      let nb_appointement =
        await this.appointmentService.fetchAppointmentBackoffice();

      return {
        statusCode: 200,
        message: 'API.FETCH.ALL.USERS',
        nb_client: nb_client.length,
        nb_employee: nb_employee.length,
        nb_pro: nb_pro.length,
        nb_company: nb_company.length,
        nb_events: nb_events.length,
        nb_appointement: nb_appointement.length,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async fetchUserByToken(user) {
    let user_data = await this.userModel.findOne({ _id: user._id }).populate([
      'subscription',
      'relatedCompany',
      // 'prestations',
    ]);
    await user_data.populate([
      'userAgenda',
      'relatedCompany.prestations',
      'relatedCompany.employees',
      { path: 'relatedCompany.employees', populate: 'userAgenda' },
      {
        path: 'relatedCompany.categories',
      },
    ]);
    const pro_data = await this.fetchProSub(
      {},
      user_data?.relatedCompany?.reletedTo,
    );
    user_data.no_show = pro_data.data.no_show;

    return user_data;
  }

  async sendNotificationToUser(backofficeNotifyUser: BackofficeNotifyUser) {
    try {
      const fromUser = await this.userModel.findOne({
        _id: backofficeNotifyUser.formUserId,
      });
      for (
        let index = 0;
        index < backofficeNotifyUser.toUserId.length;
        index++
      ) {
        const toUser = await this.userModel.findOne({
          _id: backofficeNotifyUser.toUserId[index],
        });
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.NOTIFY_USERS_BACKOFFICE,
            firstName: 'Backoffice',
            lastName: 'of the Backoffice',
            badge: await this.notificationService.badge(
              backofficeNotifyUser.toUserId[index],
            ),
          }),

          notification: NOTIFY_USERS_BACKOFFICE(
            backofficeNotifyUser.content,
            await this.notificationService.badge(
              backofficeNotifyUser.toUserId[index],
            ),
          ),
        };
        await onNotify(fromUser, toUser, this.notificationService, message);
      }

      return {
        statusCode: 200,
        message: 'API.FETCH.ALL.USERS',
        data: null,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  // async sendNotificationToAllUser(backofficeNotifyUser: BackofficeNotifyAllUser) {
  //   try {
  //     const allUsers = await this.userModel.find({
  //       $or: [{ $and: [{ type: privilege.CLIENT }, { accountVerified: true }, { active: true }, { notificationDeviceToken: { $ne: [] } }] }, { $and: [{ type: privilege.PRO }, { configurationLevel: 12 }, { active: true }, { accountVerified: true }, { notificationDeviceToken: { $ne: [] } }] }, { $and: [{ type: privilege.EMPLOYEE }, { accountVerified: true }, { active: true }, { notificationDeviceToken: { $ne: [] } }] }]
  //     },
  //     );
  //     console.log(allUsers.length);
  //     let index = 0
  //     for (let i = 0; i < allUsers.length; i++) {

  //       let message: NotificationMessage = {
  //         data: dataPayload({
  //           content: backofficeNotifyUser.content.toString(),
  //           tag: notifTag.NOTIFY_USERS_BACKOFFICE,
  //           badge: await this.notificationService.badge(
  //             allUsers[i]._id),
  //         }),
  //         notification: NOTIFY_USERS_BACKOFFICE(
  //           backofficeNotifyUser.content,
  //           await this.notificationService.badge(
  //             allUsers[i]._id
  //           ),
  //         ),
  //       };
  //       index = i
  //       onNotify(null, allUsers[i], this.notificationService, message);
  //     }

  //     return {
  //       statusCode: 200,
  //       message: SUCCEEDED,
  //       NotifNumberSend: index

  //     };
  //   } catch (error) {
  //     return {
  //       statusCode: 400,
  //       message: 'API.BAD.REQUEST',

  //     };
  //   }
  // }

  async fetchUserCa(user) {
    const user_data = await this.userModel
      .findOne({ _id: user._id })
      .select({ ca: 1, _id: 0 });
    return {
      statusCode: 200,
      message: 'API.CA.FETCHED',
      data: user_data ? user_data : 0,
    };
  }

  async userReferrelService(idUser: string) {
    const { referralLeadsCodeLink } = await this.userModel.findOne({
      _id: idUser,
    });
    console.log(referralLeadsCodeLink);

    return apiReturner(
      HttpStatus.OK,
      SUCCEEDED,
      referralLeadsCodeLink != undefined ? referralLeadsCodeLink : 'Empty',
    );
  }

  async getAllUsersIdWithoutAdmins() {
    try {
      let arrayOfId = [];
      const allUsersWithoutAdmin = await this.userModel.find(
        { type: { $ne: 'ADMIN' } },
        '_id',
      );
      for (let i = 0; i < allUsersWithoutAdmin.length; i++) {
        arrayOfId.push(allUsersWithoutAdmin[i]._id);
      }

      return {
        statusCode: 200,
        message: 'API.FETCH.ALL.USERS.ID',
        data: arrayOfId,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async getAllUsersEmailsWithoutAdmins() {
    try {
      let arrayOfId = [];
      const allUsersWithoutAdmin = await this.userModel.find({
        type: { $ne: 'ADMIN' },
      });
      for (let i = 0; i < allUsersWithoutAdmin.length; i++) {
        arrayOfId.push({
          value: `${allUsersWithoutAdmin[i].email}`,
          label: `${allUsersWithoutAdmin[i].email}`,
        });
      }

      return {
        statusCode: 200,
        message: 'API.FETCH.ALL.USERS.EMAILS',
        data: arrayOfId,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async uploadPdf(filename) {
    return this.filesService.uploadPdf(filename);
  }
  async comminSoonService(userId: string, role: string) {
    try {
      const nextAppoint = await this.appointmentService.getMynextAppointment(
        userId,
      );
      const nextEvent = await this.eventService.myNextEvent(userId, role);
      return {
        statusCode: 200,
        data: {
          nextComingAppoint: nextAppoint ? nextAppoint : null,
          nextComingEvent: nextEvent ? nextEvent : null,
        },
      };
    } catch (e) {
      console.log(e);

      throw new HttpException(
        SOMETHING_WENT_WRONG,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getAllAdmin() {
    return await this.userModel.find({ type: privilege.ADMIN });
  }

  async fetchProSub(user, proId) {
    const user_data = await this.userModel
      .findOne({ _id: proId })
      .populate('subscription', 'fonctionality')
      .select({ subscription: 1 });
    return {
      statusCode: 200,
      message: 'API.NOSHOW_FETCHED',
      data: { no_show: user_data?.subscription?.fonctionality?.no_show },
    };
  }

  async decideLeadShare(user, accept, notificationId) {
    let fetch_notification =
      await this.notificationService.fetchNotificationById(notificationId);
    const fetch_from = await this.userModel.findOne({
      _id: fetch_notification.from,
    });
    const fetch_to = await this.userModel.findOne({
      _id: fetch_notification.to,
    });
    fetch_notification.data['firstName'] = fetch_to.firstName;
    fetch_notification.data['lastName'] = fetch_to.lastName;
    fetch_notification.data['companyName'] = fetch_to.companyName
      ? fetch_to.companyName
      : '';
    if (accept == 'true') {
      fetch_notification.data['tag'] = notifTag.SHARE_ACCEPTED;
      fetch_notification.data['badge'] = await this.notificationService.badge(
        fetch_notification['from'],
      );
      let message: NotificationMessage = {
        data: dataPayload(fetch_notification.data),

        notification: SOMEONE_SHARED_YOUR_PROFILE_TO_PRO(
          await this.notificationService.badge(fetch_notification['from']),
        ),
      };
      await onNotify(fetch_to, fetch_from, this.notificationService, message);
    } else {
      fetch_notification.data['tag'] = notifTag.SHARE_REFUSED;
      fetch_notification.data['badge'] = await this.notificationService.badge(
        fetch_notification['from'],
      );
      let message: NotificationMessage = {
        data: dataPayload(fetch_notification.data),
        notification: SOMEONE_SHARED_YOUR_PROFILE_TO_PRO(
          await this.notificationService.badge(fetch_notification['from']),
        ),
      };
      await onNotify(fetch_to, fetch_from, this.notificationService, message);
    }
    await this.notificationService.deleteNotifcationQuery({
      _id: notificationId,
    });
    return {
      statusCode: 200,
      message: 'API.NOTIFICATION_UPDATED',
    };
  }

  async handleCancelation(user) {
    let array_promise = [];
    /* fetch appointments to cancel */
    const appointement_to_cancel =
      await this.appointmentService.appointmentToCancel(user);
    appointement_to_cancel.forEach((appointment) => {
      array_promise.push(
        this.appointmentService.cancelAppointment(
          { appointmentId: appointment._id },
          user,
        ),
      );
    });
    /* fetch events to cancel */
    const events_to_cancel = await this.eventService.eventsToCancel(user);
    events_to_cancel.forEach((event) => {
      array_promise.push(this.eventService.cancelEvent(event._id, user));
    });
    await Promise.allSettled(array_promise);
  }

  async deleteAccount(user) {
    // fetch the data
    const user_data = await this.userModel.findOne({ _id: user._id });
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        active: false,
        deleted: true,
        email: user_data.email + '_deleted' + new Date().toISOString(),
        siretNumber:
          user_data.siretNumber + '_deleted' + new Date().toISOString(),
        notificationDeviceToken: [],
      },
    );
    if (user_data.type == 'PRO') {
      await this.handleCancelation(user_data);
      await this.paymentService.deleteSub(user);
    }
    return {
      statusCode: 200,
      message: 'API.ACCOUNT_DELETED',
    };
  }

  async settingDeviceTokenService(_id: string, tokenData: setTokenDto) {
    await this.userModel.updateOne(
      { _id: _id },
      {
        platform: tokenData.platform ? tokenData.platform : null,
        notificationDeviceToken: [tokenData.tokenDevice],
      },
    );
    return {
      statusCode: 200,
    };
  }

  async updateUserAgend(user, data) {
    const agenda_user = await this.agendaUser.findOneAndUpdate(
      { user_id: user._id },
      data,
      { upsert: true, new: true },
    );
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      { userAgenda: agenda_user._id },
    );
    return agenda_user;
  }

  async findUserAndPopulate(query) {
    return await this.userModel.findOne(query).populate('relatedCompany');
  }

  async sendNotificationToAllUser(
    backofficeNotifyUser: BackofficeNotifyAllUser,
  ) {
    try {
      const allUsers = await this.userModel.find({
        $or: [
          {
            $and: [
              { type: privilege.CLIENT },
              { accountVerified: true },
              { active: true },
              // { notificationDeviceToken: { $ne: [] } },
            ],
          },
          {
            $and: [
              { type: privilege.PRO },
              { configurationLevel: 12 },
              { active: true },
              { accountVerified: true },
              //   { notificationDeviceToken: { $ne: [] } },
            ],
          },
          {
            $and: [
              { type: privilege.EMPLOYEE },
              { accountVerified: true },
              { active: true },
              //   { notificationDeviceToken: { $ne: [] } },
            ],
          },
        ],
      });
      console.log(allUsers.length);
      let index = 0;
      for (let i = 0; i < allUsers.length; i++) {
        let message: NotificationMessage = {
          data: dataPayload({
            content: backofficeNotifyUser.content.toString(),
            tag: notifTag.NOTIFY_USERS_BACKOFFICE,
            badge: await this.notificationService.badge(allUsers[i]._id),
          }),
          notification: NOTIFY_USERS_BACKOFFICE(
            backofficeNotifyUser.content,
            await this.notificationService.badge(allUsers[i]._id),
          ),
        };
        index = i;
        onNotify(null, allUsers[i], this.notificationService, message);
      }
      return {
        statusCode: 200,
        message: SUCCEEDED,
        NotifNumberSend: index,
      };
    } catch (error) {
      console.log(error);

      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
      };
    }
  }

  /* this is only for sandbox purpess */
  async revertProStatus() {
    await this.userModel.updateMany(
      { accountVerified: true, type: 'PRO', configurationLevel: 12 },
      { available_events: 0, subscription: null, configurationLevel: 9, ca: 0 },
    );
    await this.userModel.updateMany(
      { type: 'CLIENT' },
      { stripe_customer_id: null },
    );
  }

  async internalEndpoint() {
    await this.userModel.updateMany(
      {
        email: { $ne: 'jojin51939@crtsec.com' },
        stripe_account_id: { $ne: null },
      },
      { stripe_account_id: 'acct_1LUo36LtIjy25pof' },
    );
  }

  async sendNotificationFridayService(user: UserToken) {
    return await this.appointmentService.getMondayAppointmentService(user);
  }

  async deleteAccountBackOffice(id: string) {
    try {
      // fetch the data
      const user_data = await this.userModel.findOne({ _id: id });
      await this.userModel.findOneAndUpdate(
        { _id: id },
        {
          active: false,
          deleted: true,
          email: user_data.email + '_deleted' + new Date().toISOString(),
          siretNumber:
            user_data.siretNumber + '_deleted' + new Date().toISOString(),
          notificationDeviceToken: [],
        },
      );

      if (user_data.type == 'PRO') {
        await this.handleCancelation(user_data);
        await this.paymentService.deleteSub(user_data);
      }

      const data = await this.campanyService.getCompanyByUserId(id);
      Promise.all(
        data['employees'].map(async (empData) => {
          await this.userModel.updateMany(
            { _id: empData._id },
            {
              active: false,
              deleted: true,
              email: empData.email + '_deleted' + new Date().toISOString(),
              notificationDeviceToken: [],
            },
          );
        }),
      );

      return {
        statusCode: 200,
        message: 'API.ACCOUNT_DELETED',
        data: [],
      };
    } catch (e) {
      return new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);
    }
  }

  async getUserLocaleService(user: UserToken) {
   try{
    const { userLocale } = await this.userModel.findOne({ _id: user._id })
     return apiReturner(HttpStatus.OK,SUCCEEDED,{
      userLocale
    })
  } catch (e) {
    return new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);
  }


  }

  async setUserLocaleService(user: any, local: any) {
  
    try{
      const done=await this.userModel.updateOne({ _id: user._id }, { userLocale: local.userLocale })
      if (done) {
        return apiReturner(HttpStatus.OK, SUCCEEDED)
      } else {
        return new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);     
      }
  
  } catch (e) {
    return new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);
  }
  }


  // async deleteAccountBackOffice(id: string) {
  //   // fetch the data
  //   const user_data = await this.userModel.findOne({ _id: id })
  //   await this.userModel.findOneAndUpdate(
  //     { _id: id },
  //     { active: false, deleted: true, email: user_data.email + "_deleted" + new Date().toISOString(), siret: null, notificationDeviceToken: [] },
  //   );

  //   const data = await this.campanyService.getCompanyByUserId(id)
  //   Promise.all(data['employees'].map(async empData => {
  //     await this.userModel.updateOne(
  //       { _id: empData._id },
  //       { active: false, deleted: true, email: empData.email + "_deleted" + new Date().toISOString(), siret: null, notificationDeviceToken: [] },
  //     );
  //   }
  //   ))
  //   return {
  //     statusCode: 200,
  //     message: 'API.ACCOUNT_DELETED',

  //   };
  // }
}
//!✂️- - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - -
