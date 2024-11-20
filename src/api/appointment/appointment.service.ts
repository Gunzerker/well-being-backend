import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { User } from '../users/models/user.model';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  Appointment,
  AppointmentBusinessInstance,
  AppointmentInstance,
} from './schemas/appointment.entity';
import { CompanyService } from '../companies/company.service';
import { PaymentService } from '../payment/payment.service';
import { UsersService } from '../users/users.service';
import { FetchAppointmentByDateDto } from './dto/fetch-appointment-by-date';

import { appointStatus, notifTag, privilege } from 'src/shared/enums';
import { PrestationService } from '../prestation/prestation.service';

import { createTwilioRoom } from 'src/shared/createTwilioRoom';

import { WalletService } from '../wallet/wallet.service';
import { v4 as uuidv4 } from 'uuid';
import { AppointmentStat } from './schemas/appointment.stat';
import { UserToken } from 'src/shared/tokenModel';

import {
  ACCEPTED_APPOINTEMENT_FOR_C,
  APPOINTEMNT_DEMANDE_FOR_EMPLOYEE,
  APPOINTMENT_FINISHED_FOR_CLIENT,
  APPOINTMENT_FINISHED_FOR_EMP,
  APPOINTMENT_FINISHED_FOR_PRO,
  CANCLED_APPOINTEMENT_FOR_C,
  CANCLED_APPOINTEMENT_FOR_EMP,
  CANCLED_APPOINTEMENT_FOR_P,
  CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
  NO_SHOW_PASS,
  NO_SHOW_REQUEST,
  POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
  POSTPOINTED_APPOINTEMENT_FOR_C,
  POSTPOINTED_APPOINTEMENT_FOR_EMP,
  POSTPOINTED_APPOINTEMENT_FOR_P,
  REFUSED_APPOINTEMENT_FOR_C,
  REFUSED_APPOINTEMENT_FOR_E,
  REFUSED_APPOINTEMENT_FOR_P,
  SUCCEEDED,
} from 'src/constantes/constantes';
import {
  dataPayload,
  dataPayloadToAdmin,
  NotificationMessage,
  onNotify,
} from 'src/shared/notif.class';
import { NotificationService } from '../notifications/notification.service';
import * as moment from 'moment';
import { apiReturner } from 'src/shared/returnerApi';
import { IoTThingsGraph } from 'aws-sdk';
import { QuotationService } from '../quotation/quotation.service';
import { TheNext } from '../events/schemas/event.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectModel(AppointmentInstance.name)
    private appointmentInstanceModel: Model<AppointmentInstance>,
    @InjectModel(TheNext.name) private thnextModel: Model<TheNext>,
    @InjectModel(AppointmentBusinessInstance.name)
    private appointmentBusinessInstanceModel: Model<AppointmentBusinessInstance>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(AppointmentStat.name)
    private AppointmentStatModel: Model<AppointmentStat>,
    private readonly companyService: CompanyService,
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly prestationService: PrestationService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => QuotationService))
    private quotationService: QuotationService,
  ) {}

  create(createAppointmentDto: CreateAppointmentDto) {
    return 'This action adds a new appointment';
  }

  async postponeAppoitment(postponeAppointmentDto, user: UserToken) {
    /* fetch prestation data*/
    const appointment_data = await this.appointmentModel
      .findOne({
        _id: postponeAppointmentDto.appointmentId,
      })
      .populate('prestations');
    let appointmentInstace = null;
    let appointmentMultiInstance = null;
    if (appointment_data['online'] == true) {
      appointmentInstace = await this.appointmentInstanceModel.findOneAndUpdate(
        {
          _id: appointment_data.appointmentInstance,
        },
        {
          start_date: postponeAppointmentDto.new_start_time,
          end_date:
            new Date(postponeAppointmentDto.new_start_time).getTime() +
            appointment_data['duration'] * 60000,
          prestation: appointment_data['prestations'],
        },
        { upsert: true, new: true },
      );
    }

    if (appointment_data['multi_business'] == true) {
      appointmentMultiInstance =
        await this.appointmentBusinessInstanceModel.findOneAndUpdate(
          {
            _id: appointment_data['appointmentMultiInstance'],
          },
          {
            start_date: postponeAppointmentDto.new_start_time,
            end_date:
              new Date(postponeAppointmentDto.new_start_time).getTime() +
              appointment_data['duration'] * 60000,
          },
          { new: true },
        );
    }
    let query;
    console.log();
    if (appointmentInstace != null)
      query = { appointmentInstance: appointmentInstace['_id'] };
    if (appointmentMultiInstance != null)
      query = {
        appointmentMultiInstance: appointment_data['appointmentMultiInstance'],
      };
    if (appointmentInstace == null && appointmentMultiInstance == null)
      query = { _id: postponeAppointmentDto.appointmentId };

    const res = await this.appointmentModel.updateMany(query, {
      old_start_date: appointment_data.start_date,
      old_end_date: appointment_data.end_date,
      start_date: postponeAppointmentDto.new_start_time,
      end_date:
        new Date(postponeAppointmentDto.new_start_time).getTime() +
        appointment_data['duration'] * 60000,
      appointmentInstance: appointmentInstace
        ? appointmentInstace['_id']
        : null,
      status: 'PostPoned',
    });
   
    //!Notif
    const usr = await this.userService.getUserById(user._id);
    await this.userService.updateServices(user._id, {
      appointmentStatPosPTryNumber: Number(
        usr.data.appointmentStatPosPTryNumber
          ? usr.data.appointmentStatPosPTryNumber + 1
          : 0 + 1,
      ),
    });

    const newAppoint = await this.appointmentModel
      .find(query)
      .populate(['from', 'to']);
    const whoPostpoined = await this.userService.getUserById(user._id);

    await this.checkApointemntStatLimit(
      usr.data,
      appointStatus.POSTPOINED_APPOINTEMENT,
    );
    //!Notif

    switch (whoPostpoined.data.type) {
      case privilege.CLIENT: {
        //
        newAppoint.forEach(async (newAppoint) => {
          for (let i = 0; i < newAppoint.assigned_employees.length; i++) {
            const notifTarget = await this.userService.getUserById(
              newAppoint.assigned_employees[i].to,
            );
            if (notifTarget.data.type == privilege.PRO) {
              let message: NotificationMessage = {
                data: dataPayload({
                  tag: notifTag.POSTPOINTED_APPOINTEMENT_FOR_P,
                  firstName: newAppoint.from.firstName,
                  lastName: newAppoint.from.lastName,
                  companyName: newAppoint.from.companyName,
                  start_date: newAppoint.old_start_date.toISOString(),
                  badge: await this.notificationService.badge(
                    notifTarget.data._id,
                  ),
                  new_date: newAppoint.start_date.toISOString(),
                }),
                notification: POSTPOINTED_APPOINTEMENT_FOR_P(
                  await this.notificationService.badge(notifTarget.data._id),
                ),
              };

              await onNotify(
                newAppoint.from,
                notifTarget.data,
                this.notificationService,
                message,
              );
            } else {
              let message: NotificationMessage = {
                data: dataPayload({
                  tag: notifTag.POSTPOINTED_APPOINTEMENT_FOR_EMP,
                  firstName: newAppoint.from.firstName,
                  lastName: newAppoint.from.lastName,
                  companyName: newAppoint.from.companyName,
                  start_date: newAppoint.old_start_date.toISOString(),
                  new_date: newAppoint.start_date.toISOString(),
                  badge: await this.notificationService.badge(
                    notifTarget.data._id,
                  ),
                }),
                notification: POSTPOINTED_APPOINTEMENT_FOR_EMP(
                  await this.notificationService.badge(notifTarget.data._id),
                ),
              };

              await onNotify(
                newAppoint.from,
                notifTarget.data,
                this.notificationService,
                message,
              );
            }
          }
        });

        break;
      }
      case privilege.EMPLOYEE: {
        console.log(newAppoint);
        newAppoint.forEach(async (newAppoint) => {
          let message: NotificationMessage = {
            data: dataPayload({
              tag: notifTag.POSTPOINTED_APPOINTEMENT_FOR_C,
              badge: await this.notificationService.badge(newAppoint.from._id),
              firstName: newAppoint.to.firstName,
              lastName: newAppoint.to.lastName,
              companyName: newAppoint.to.companyName,
              start_date: newAppoint.old_start_date.toISOString(),
            }),
            notification: POSTPOINTED_APPOINTEMENT_FOR_C(
              await this.notificationService.badge(newAppoint.from._id),
            ),
          };
          //**************************************************************************** */

          await onNotify(
            newAppoint.to,
            newAppoint.from,
            this.notificationService,
            message,
          );

          //**************************************************************************** */
        });
        break;
      }
      case privilege.PRO: {

        console.log(newAppoint);
        newAppoint.forEach(async (newAppoint) => {
          let message: NotificationMessage = {
            data: dataPayload({
              tag: notifTag.POSTPOINTED_APPOINTEMENT_FOR_C,
              badge: await this.notificationService.badge(newAppoint.from._id),
              firstName: newAppoint.to.firstName,
              lastName: newAppoint.to.lastName,
              companyName: newAppoint.to.companyName,
              start_date: newAppoint.old_start_date.toISOString(),
            }),
            notification: POSTPOINTED_APPOINTEMENT_FOR_C(
              await this.notificationService.badge(newAppoint.from._id),
            ),
          };
          //**************************************************************************** */

          await onNotify(
            newAppoint.to,
            newAppoint.from,
            this.notificationService,
            message,
          );

          //**************************************************************************** */
        });
        await this.thnextModel.updateMany({
          appointment: postponeAppointmentDto?.appointmentId 
        }, {
          comparativeDate: postponeAppointmentDto?.new_start_time,
          soonInH: Math.abs(moment().diff(postponeAppointmentDto?.new_start_time, 'hours')),
          soonInM: Math.abs(moment().diff(postponeAppointmentDto?.new_start_time, 'minutes')),
        });
        break;
      }
    }
    return { statusCode: 200, message: 'API.APPOINTMENT_POSTPONED' };
  }
  async checkApointemntStatLimit(user: User, type: string) {
    console.log('enter to check');
    const targetUser = user;
    switch (type) {
      case appointStatus.POSTPOINED_APPOINTEMENT: {
        const oldStat = await this.AppointmentStatModel.findOne({
          userId: user._id,
          type: appointStatus.POSTPOINED_APPOINTEMENT,
        });

        if (oldStat) {
          // const createdAt = new Date(oldStat.createdAt).getTime();
          // const updatedAt = new Date(oldStat.updatedAt).getTime();
          // const diffDays = Math.ceil(
          //   updatedAt - createdAt / (1000 * 60 * 60 * 24),
          // );
          let date1 = moment(oldStat.createdAt);
          let date2 = moment(oldStat.updatedAt);
          let diff = date2.diff(date1, 'days');
          console.log(diff);

          // console.log('diffDays: =>>>>>>>>>>>>>', diffDays);
          if (oldStat.tryNumber == 3 && diff <= 7) {
            // todo notificiation sent here ...
            const admins = await this.userService.getAllAdmin();
            if (admins.length > 0) {
              admins.map(async (admin) => {
                let messageToAdmin: NotificationMessage = {
                  data: dataPayloadToAdmin(
                    targetUser._id,
                    targetUser.firstName,
                    targetUser.lastName,
                    targetUser.profileImage,
                    notifTag.POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
                  ),

                  notification:
                    POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES(
                      await this.notificationService.badge(admin._id),
                    ),
                };
                await onNotify(
                  null,
                  admin,
                  this.notificationService,
                  messageToAdmin,
                );
              });
            }

            let message: NotificationMessage = {
              data: dataPayload({
                tag: notifTag.POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
                badge: await this.notificationService.badge(user._id),
              }),
              notification:
                POSTOINED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES(
                  await this.notificationService.badge(user._id),
                ),
            };

            //**************************************************************************** */

            await onNotify(null, targetUser, this.notificationService, message);
            await this.AppointmentStatModel.findOneAndUpdate(
              {
                userId: user._id,

                type: appointStatus.POSTPOINED_APPOINTEMENT,
              },
              {
                userId: user._id,

                tryNumber: 0,
                type: appointStatus.POSTPOINED_APPOINTEMENT,
              },
            );

            //**************************************************************************** */
          } else {
            await this.AppointmentStatModel.findOneAndUpdate(
              {
                userId: user._id,

                type: appointStatus.POSTPOINED_APPOINTEMENT,
              },
              {
                userId: user._id,

                tryNumber: Number(oldStat.tryNumber + 1),
                type: appointStatus.POSTPOINED_APPOINTEMENT,
              },
              //  { upsert: true },
            );
          }
        } else {
          await this.AppointmentStatModel.create({
            userId: user._id,
            tryNumber: 1,
            type: appointStatus.POSTPOINED_APPOINTEMENT,
          });
        }

        break;
      }
      case appointStatus.CANCLED_APPOINTEMENT: {
        console.log('inside cancel check ');

        const oldStat = await this.AppointmentStatModel.findOne({
          userId: user._id,
          type: appointStatus.CANCLED_APPOINTEMENT,
        });
        console.log('oldStat', oldStat);

        if (oldStat) {
          // const createdAt = new Date(oldStat.createdAt).getTime();
          // const updatedAt = new Date(oldStat.updatedAt).getTime();

          // const diffDays = Math.ceil(
          //   updatedAt - createdAt / (1000 * 60 * 60 * 24),
          // );
          let date1 = moment(oldStat.createdAt);
          let date2 = moment(oldStat.updatedAt);
          let diff = date2.diff(date1, 'days');
          console.log(diff);

          if (oldStat.tryNumber == 3 && diff <= 7) {
            // if (oldStat.tryNumber == 2 && diff == 0) {
            // todo notificiation sent here ...
            const admins = await this.userService.getAllAdmin();
            console.log(admins.length);

            if (admins.length > 0) {
              admins.map(async (admin) => {
                let messageToAdmin: NotificationMessage = {
                  data: dataPayloadToAdmin(
                    targetUser._id,
                    targetUser.firstName,
                    targetUser.lastName,
                    targetUser.profileImage,
                    notifTag.CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
                  ),
                  notification:
                    CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES(
                      await this.notificationService.badge(admin._id),
                    ),
                };
                await onNotify(
                  null,
                  admin,
                  this.notificationService,
                  messageToAdmin,
                );
              });
            }
            let message: NotificationMessage = {
              data: dataPayload({
                tag: notifTag.CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES,
                badge: await this.notificationService.badge(user._id),
              }),

              notification: CANCLED_APPOINTEMENT_RUNOVER_THE_LIMIT_BY_3_WEEKES(
                await this.notificationService.badge(user._id),
              ),
            };

            //**************************************************************************** */

            await onNotify(null, targetUser, this.notificationService, message);

            //**************************************************************************** */
            await this.AppointmentStatModel.findOneAndUpdate(
              {
                userId: oldStat.userId,

                type: appointStatus.CANCLED_APPOINTEMENT,
              },
              {
                userId: oldStat.userId,

                tryNumber: 0,
                type: appointStatus.CANCLED_APPOINTEMENT,
              },
            );
          } else {
            await this.AppointmentStatModel.findOneAndUpdate(
              {
                userId: oldStat.userId,

                type: appointStatus.CANCLED_APPOINTEMENT,
              },
              {
                userId: oldStat.userId,

                tryNumber: Number(oldStat.tryNumber + 1),
                type: appointStatus.CANCLED_APPOINTEMENT,
              },
              //   { upsert: true },
            );
          }
        } else {
          await this.AppointmentStatModel.create({
            userId: user._id,
            tryNumber: 1,
            type: appointStatus.CANCLED_APPOINTEMENT,
          });
        }

        break;
      }
    }
  }

  // var diffDays = parseInt((updatedAt - createdAt) / (1000 * 60 * 60 * 24), 10);

  //
  //
  //
  //
  //
  //
  //

  async fetchAvailableEmployee(appointmentId, user) {
    /* fetch the employees */
    //user._id = '645561ec57536ed5ef80180f';
    const company = await this.companyService.getCompanyByUserId(user._id);
    let employees = company['employees'];
    /* fetch current user data */
    const owner_data = await this.userService.findUserByWithPopulatedAgenda({
      _id: user._id,
    });
    employees.push(owner_data);
    //employees[0]['_id'] = '6311e06128ba5a165db79156';
    const appointmentData = await this.appointmentModel.findOne({
      _id: appointmentId,
    });
    let new_employees = [];
    new_employees = await this.filterEmployees(
      employees,
      appointmentData['start_date'],
      appointmentData['end_date'],
      appointmentData['at_home'],
      appointmentData['at_business'],
      appointmentData['break'],
    );
    new_employees = await this.fetchAvailableEmployeeFunc(
      new_employees,
      appointmentData['start_date'],
      appointmentData['end_date'],
      appointmentData,
    );
    return {
      statusCode: 200,
      message: 'API.USERS_FETCHED',
      data: new_employees,
    };
  }

  async fetchAvailableEmployeeFunc(
    employees,
    start_date,
    end_date,
    appointmentData?,
  ) {
    let new_employees = [];
    for (let i = 0; i < employees.length; i++) {
      /* fetch if the user can't do the job */
      const check = await this.appointmentModel
        .findOne({
          start_date: { $lt: end_date },
          end_date: { $gt: start_date },
          //$or: [{ status: 'Accepted' }, { status: 'Pending' }],
          $or: [
            {
              status: 'Pending',
              level: 1,
              assigned_employees: {
                $elemMatch: {
                  to: employees[i]['_id'],
                  $or: [
                    { accept_status: 'Accepted' },
                    { accept_status: 'Pending' },
                  ],
                },
              },
            },
            {
              status: 'Accepted',
              assigned_employees: {
                $elemMatch: {
                  to: employees[i]['_id'],
                },
              },
            },
          ],
        })
        .populate('appointmentMultiInstance')
        .populate('appointmentInstance');
      if (!check && employees[i]['available'] == true)
        new_employees.push(employees[i]);
      if (check && appointmentData?.multi_business == true){
        if (start_date.toISOString() == check.start_date.toISOString() && end_date.toISOString() == check.end_date.toISOString() && check.appointmentMultiInstance?.attending_members < check["participantsNumber"])
          new_employees.push(employees[i]);
      }
      if (check?.["online"] == true && appointmentData?.online == true){
        if (check?.["participantsNumber"]>check?.appointmentInstance?.attending_members)
          new_employees.push(employees[i]);
      }
    }
    return new_employees;
  }

  async findMyAppointments(page_size, page_number, user, search) {
    let query = {};
    if (!search) search = '';
    if (user.role == 'PRO')
      query = {
        active: true,
        // @ts-ignore
        to: new mongoose.Types.ObjectId(user._id),
        level: 0,
        status: 'Pending',
      };
    else
      query = {
        active: true,
        level: 1,
        // @ts-ignore
        assigned_employees: {
          $elemMatch: {
            // @ts-ignore
            to: new mongoose.Types.ObjectId(user._id),
            accept_status: 'Pending',
          },
        },
      };
    const appointments = await this.appointmentModel.aggregate([
      { $match: query },
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
      {
        $lookup: {
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },

      { $unwind: '$to.relatedCompany' },
      {
        $lookup: {
          from: 'categories',
          localField: 'to.relatedCompany.categories',
          foreignField: '_id',
          as: 'to.relatedCompany.categories',
        },
      },
      { $unionWith: '$to.relatedCompany.categories' },
      {
        $lookup: {
          from: 'users',
          localField: 'to.relatedCompany.employees',
          foreignField: '_id',
          as: 'to.relatedCompany.employees',
        },
      },
      { $unionWith: '$to.relatedCompany.employees' },
      {
        $lookup: {
          from: 'prestations',
          localField: 'to.relatedCompany.prestations',
          foreignField: '_id',
          as: 'to.relatedCompany.prestations',
        },
      },
      //{ $unionWith: '$to.relatedCompany.employees' },

      { $unwind: { path: '$from' } },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: { path: '$company' } },
      {
        $lookup: {
          from: 'prestations',
          localField: 'prestations',
          foreignField: '_id',
          as: 'prestations',
        },
      },
      {
        $match: {
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
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);
    const total = await this.appointmentModel.aggregate([
      { $match: query },
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
        $match: {
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
          ],
        },
      },
    ]);
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_FETCHED',
      data: appointments,
      page_number,
      page_size,
      total_attributs: total.length,
      total_appointments: total.length,
      total_devis: (
        await this.quotationService.getQuotationsForPro(user._id, '', 1, 1)
      ).total_attributs,
    };
  }

  async findMyAppointmentsClient(page_size, page_number, user, search, filter) {
    /* filter takes either Pending , Accepted , PostPoned */
    if (!search) search = '';
    let appointments = await this.appointmentModel.aggregate([
      {
        $match: {
          // @ts-ignore
          from: new mongoose.Types.ObjectId(user._id),
          active: true,
          status: filter,
          started: false,
        },
      },
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
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },

      { $unwind: '$to.relatedCompany' },
      {
        $lookup: {
          from: 'categories',
          localField: 'to.relatedCompany.categories',
          foreignField: '_id',
          as: 'to.relatedCompany.categories',
        },
      },
      { $unionWith: '$to.relatedCompany.categories' },
      {
        $lookup: {
          from: 'users',
          localField: 'to.relatedCompany.employees',
          foreignField: '_id',
          as: 'to.relatedCompany.employees',
        },
      },
      { $unionWith: '$to.relatedCompany.employees' },
      {
        $lookup: {
          from: 'prestations',
          localField: 'to.relatedCompany.prestations',
          foreignField: '_id',
          as: 'to.relatedCompany.prestations',
        },
      },
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
        $lookup: {
          from: 'prestations',
          localField: 'prestations',
          foreignField: '_id',
          as: 'prestations',
        },
      },

      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'company.categories',
          foreignField: '_id',
          as: 'company.categories',
        },
      },
      {
        $match: {
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: ['$to.firstName', ' ', '$to.lastName'],
                  },
                  regex: new RegExp(`${search}`),
                  options: 'i',
                },
              },
            },
            {
              'to.firstName': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
            {
              'to.lastName': { $regex: new RegExp(`${search}`), $options: 'i' },
            },
            {
              'to.phoneNumber': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
            {
              'company.companyName': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
          ],
        },
      },
      {
        $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0,
      },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);
    let total;
    const [PendingCount, AcceptedCount, PostPonedCount] = await Promise.all([
      this.calculateRequestAppoitmentsCount(search, 'Pending', user),
      this.calculateRequestAppoitmentsCount(search, 'Accepted', user),
      this.calculateRequestAppoitmentsCount(search, 'PostPoned', user),
    ]);
    if (filter == 'Pending') total = PendingCount;
    if (filter == 'Accepted') total = AcceptedCount;
    if (filter == 'PostPoned') total = PostPonedCount;
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_FETCHED',
      data: appointments,
      page_number,
      page_size,
      total_attributs: appointments.length,
      total_pending: PendingCount,
      total_accepted: AcceptedCount,
      total_postponed: PostPonedCount,
    };
  }

  async calculateRequestAppoitmentsCount(search, filter, user) {
    const total = await this.appointmentModel.aggregate([
      {
        $match: {
          // @ts-ignore
          from: new mongoose.Types.ObjectId(user._id),
          active: true,
          status: filter,
          started: false,
        },
      },
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
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { 'to.firstName': { $regex: search, $options: 'i' } },
            { 'to.lastName': { $regex: search, $options: 'i' } },
            { 'to.phoneNumber': { $regex: search, $options: 'i' } },
            { 'company.companyName': { $regex: search, $options: 'i' } },
          ],
        },
      },
    ]);
    return total.length;
  }

  async fetchAppointmentsAgenda(
    start_date,
    end_date,
    employeeId,
    remote_group,
  ) {
    let appointments_agenda;
    appointments_agenda = await this.appointmentInstanceModel.aggregate([
      {
        $match: {
          // @ts-ignore
          to: new mongoose.Types.ObjectId(employeeId),
          start_date: { $gte: new Date(start_date) },
          end_date: { $lte: new Date(end_date) },
          attending_members: { $ne: 0 },
        },
      },
      // {
      //   $lookup: {
      //     from: 'appointments',
      //     localField: 'prestation',
      //     foreignField: '_id',
      //     as: 'prestation',
      //   },
      // },
      // { $unwind: '$prestation' },
      // {$match:{"prestation.status":"Accepted"}},
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$start_date' } },
          times: {
            $push: {
              start_date: '$start_date',
              end_date: '$end_date',
              attending_members: '$attending_members',
              prestationId: '$prestation',
              to: '$to',
              multi: false,
              online: true,
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    const appointments_agenda_face = await this.appointmentModel.aggregate([
      {
        $match: {
          start_date: { $gte: new Date(start_date) },
          end_date: { $lte: new Date(end_date) },
          // @ts-ignore
          assigned_employees: {
            // @ts-ignore
            $elemMatch: { to: new mongoose.Types.ObjectId(employeeId) },
          },
          status: 'Accepted',
          appointmentInstance: null,
          appointmentMultiInstance: null,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$start_date' } },
          times: {
            $push: { start_date: '$start_date', end_date: '$end_date' },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const appointments_multi =
      await this.appointmentBusinessInstanceModel.aggregate([
        {
          $match: {
            // @ts-ignore
            to: new mongoose.Types.ObjectId(employeeId),
            start_date: { $gte: new Date(start_date) },
            end_date: { $lte: new Date(end_date) },
            attending_members: { $ne: 0 },
          },
        },
        // {
        //   $lookup: {
        //     from: 'appointments',
        //     localField: 'prestation',
        //     foreignField: '_id',
        //     as: 'prestation',
        //   },
        // },
        // { $unwind: '$prestation' },
        // {$match:{"prestation.status":"Accepted"}},
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$start_date' } },
            times: {
              $push: {
                start_date: '$start_date',
                end_date: '$end_date',
                attending_members: '$attending_members',
                prestationId: '$prestation',
                to: '$to',
                multi: true,
                online: false,
              },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
    appointments_agenda.push(
      ...appointments_agenda_face,
      ...appointments_multi,
    );
    let result = [];
    for (
      var d = new Date(start_date);
      d <= new Date(end_date);
      d.setDate(d.getDate() + 1)
    ) {
      d = new Date(d.getTime());
      d.setUTCHours(0, 0, 0, 0);
      result.push({ _id: d.toISOString(), times: [] });
    }
    for (let i = 0; i < appointments_agenda.length; i++) {
      for (let j = 0; j < result.length; j++) {
        if (
          new Date(appointments_agenda[i]['_id']).toISOString() ==
          result[j]['_id']
        )
          result[j]['times'].push(...appointments_agenda[i]['times']);
      }
    }
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_FETCHED',
      data: result,
    };
  }

  async findAll(fetchAppointmentByDateDto: FetchAppointmentByDateDto) {
    let filterNameClient = {};
    let status = {};
    if (fetchAppointmentByDateDto.status) {
      status = { status: `${fetchAppointmentByDateDto.status}` };
    }
    if (fetchAppointmentByDateDto.searchText) {
      filterNameClient = {
        $or: [
          {
            'client.firstName': {
              $regex: fetchAppointmentByDateDto.searchText,
              $options: '-i',
            },
          },
          {
            'client.lastName': {
              $regex: fetchAppointmentByDateDto.searchText,
              $options: '-i',
            },
          },
          {
            'pro.firstName': {
              $regex: fetchAppointmentByDateDto.searchText,
              $options: '-i',
            },
          },
          {
            'pro.lastName': {
              $regex: fetchAppointmentByDateDto.searchText,
              $options: '-i',
            },
          },
        ],
      };
    }

    const appointment = await this.appointmentModel.aggregate([
      {
        $match: {
          $and: [
            {
              start_date: {
                $gte: new Date(
                  `${fetchAppointmentByDateDto.start_date} 00:00:00.00+00:00`,
                ),
              },
            },
            {
              end_date: {
                $lte: new Date(
                  `${fetchAppointmentByDateDto.end_date} 23:59:59.00+00:00`,
                ),
              },
            },
          ],
        },
      },
      // assigned_employees
      { $unwind: '$assigned_employees' },
      {
        $lookup: {
          from: 'users',
          localField: 'assigned_employees.to',
          foreignField: '_id',
          as: 'employees',
        },
      },
      {
        $lookup: {
          from: 'prestations',
          localField: 'prestations',
          foreignField: '_id',
          as: 'prestations',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'client',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'pro',
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $match: filterNameClient,
      },
      {
        $match: status,
      },
      { $sort: { start_date: 1 } },
      {
        $skip:
          fetchAppointmentByDateDto.page_number &&
            fetchAppointmentByDateDto.page_size
            ? (+fetchAppointmentByDateDto.page_number - 1) *
            +fetchAppointmentByDateDto.page_size
            : 0,
      },
      {
        $limit:
          fetchAppointmentByDateDto.page_number &&
            fetchAppointmentByDateDto.page_size
            ? +fetchAppointmentByDateDto.page_size
            : 10,
      },
    ]);

    const totalAppointments = await this.appointmentModel.aggregate([
      {
        $match: {
          $and: [
            {
              start_date: {
                $gte: new Date(
                  `${fetchAppointmentByDateDto.start_date} 00:00:00.00+00:00`,
                ),
              },
            },
            {
              end_date: {
                $lte: new Date(
                  `${fetchAppointmentByDateDto.end_date} 23:59:59.00+00:00`,
                ),
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'prestations',
          localField: 'prestations',
          foreignField: '_id',
          as: 'prestations',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'client',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'pro',
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $match: filterNameClient,
      },
      {
        $match: status,
      },
    ]);

    return {
      statusCode: 200,
      message: 'API.ALL.APPOINTMENTS.FOR.CALENDAR',
      data: appointment,
      page_number: fetchAppointmentByDateDto.page_number,
      page_size: fetchAppointmentByDateDto.page_size,
      total_attributs: totalAppointments.length,
    };
  }

  checkAlreadyAssigned(appointment, user_id): boolean {
    for (let i = 0; i < appointment.assigned_employees.length; i++) {
      if (String(user_id.to) == String(appointment.assigned_employees[i].to))
        return true;
    }
    return false;
  }

  async assign(updateAppointmentDto: UpdateAppointmentDto, user) {
    /* fetech the appointment */
    let toNotify = [];
    let { appointmentId, userId, refused } = updateAppointmentDto;
    let appointment2 = await this.appointmentModel
      .findOne({
        _id: updateAppointmentDto.appointmentId,
      })
      .populate(['to', 'from', 'prestations', 'appointmentInstance']);

    /* to delete start here */

    // if (appointment2['online'] == true && refused == false) {
    //   //throw new HttpException('PRO IS UNAIVALABLE', HttpStatus.BAD_REQUEST);
    //   const employee_disponibility = await this.fetchAvailableEmployee(
    //     updateAppointmentDto.appointmentId,
    //     user,
    //   );
    //   if (
    //     !employee_disponibility.data.find(
    //       (employee) => employee._id == user._id,
    //     )
    //   )
    //     throw new HttpException('PRO IS UNAIVALABLE', HttpStatus.BAD_REQUEST);
    //   if (
    //     !employee_disponibility.data.find(
    //       (employee) => employee._id == user._id,
    //     )
    //   )
    //     if (
    //       appointment2.appointmentInstance['attending_members'] >=
    //       appointment2['participantsNumber']
    //     )
    //       throw new HttpException('PRO IS UNAIVALABLE', HttpStatus.BAD_REQUEST);
    // }

    /* to delete end here */

    let appointment = await this.appointmentModel.findOne({
      _id: updateAppointmentDto.appointmentId,
    });

    let updateQuery = {};

    if (refused == true) {
      updateQuery['status'] = 'Refused';
      const appointment_data = await this.appointmentModel
        .findOneAndUpdate(
          { _id: updateAppointmentDto.appointmentId },
          updateQuery,
        )
        .populate('payment_id');
      await this.thnextModel.deleteMany({appointment:updateAppointmentDto.appointmentId})
      /* create a refund */
      await this.paymentService.createRefund(
        appointment_data?.['payment_id']['stripe_data']['data']['object']['id'],
        appointment_data.payment_id,
        appointment_data['total_amount'] + 100,
        true,
        false,
      );

      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.REFUSED_APPOINTEMENT_FOR_C,
          firstName: appointment2.to.firstName,
          lastName: appointment2.to.lastName,
          companyName: appointment2.to.companyName,
          start_date: appointment2.start_date.toISOString(),
          badge: await this.notificationService.badge(appointment2.from._id),
        }),
        notification: REFUSED_APPOINTEMENT_FOR_C(
          await this.notificationService.badge(appointment2.from._id),
        ),
      };

      await onNotify(
        appointment2.to,
        appointment2.from,
        this.notificationService,
        message,
      );

      return {
        statusCode: 200,
        message: 'API.APPOINTMENTS_FETCHED',
      };
    }
    let appointmentMultiInstance = null;
    if (
      appointment['assigned_employees'].length == 0 &&
      userId.length == 1 &&
      userId[0].to == user._id
    ) {
      /* create an appointment instance for multi busniss */
      if (appointment.multi_business == true)
        appointmentMultiInstance =
          await this.appointmentBusinessInstanceModel.findOneAndUpdate(
            {
              start_date: appointment.start_date,
              end_date: appointment.end_date,
              prestation: appointment['prestations'],
              to: userId[0].to,
            },
            {
              $inc: { attending_members: 1 },
            },
            { upsert: true, new: true },
          );
      updateQuery['status'] = 'Accepted';
      userId[0]['accept_status'] = 'Accepted';
      updateQuery['assigned_employees'] = userId;
      updateQuery['appointmentMultiInstance'] = appointmentMultiInstance
        ? appointmentMultiInstance._id
        : null;
      if (appointment['online'] == true) {
        const appointmentInstace =
          await this.appointmentInstanceModel.findOneAndUpdate(
            {
              to: user._id,
              start_date: appointment2.start_date,
              end_date: appointment2.end_date,
              prestation: appointment2.prestations[0],
            },
            { $inc: { attending_members: 1 } },
            { upsert: true, new: true },
          );
        updateQuery['appointmentInstance'] = appointmentInstace._id;
      }
      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.ACCEPTED_APPOINTEMENT_FOR_C,
          firstName: appointment2.to.firstName,
          lastName: appointment2.to.lastName,
          companyName: appointment2.to.companyName,
          start_date: appointment2.start_date.toISOString(),
          badge: await this.notificationService.badge(appointment2.from._id),
        }),
        notification: ACCEPTED_APPOINTEMENT_FOR_C(
          await this.notificationService.badge(appointment2.from._id),
        ),
      };

      await onNotify(
        appointment2.to,
        appointment2.from,
        this.notificationService,
        message,
      );

      //console.log(updateQuery)
    } else {
      for (let i = 0; i < userId.length; i++) {
        (userId[i]['assigned_by_user'] = this.checkAlreadyAssigned(
          appointment,
          userId[i],
        )),
          console.log(userId[i]);
        if (userId[i]['to'] == user._id) {
          userId[i]['accept_status'] = 'Accepted';
          //! to him
        } else {
          const targetEmp = await this.userService.getUserById(userId[i].to);
          //! to emp
          let message: NotificationMessage = {
            data: dataPayload({
              tag: notifTag.APPOINTEMNT_DEMANDE_FOR_EMPLOYEE,
              firstName: appointment2.from.firstName,
              lastName: appointment2.from.lastName,
              companyName: appointment2.from.companyName,
              start_date: appointment2.start_date.toISOString(),
              badge: await this.notificationService.badge(targetEmp.data._id),
            }),

            notification: APPOINTEMNT_DEMANDE_FOR_EMPLOYEE(
              await this.notificationService.badge(targetEmp.data._id),
            ),
          };

          //**************************************************************************** */

          await onNotify(
            appointment2.from,
            targetEmp.data,
            this.notificationService,
            message,
          );

          //**************************************************************************** */
        }
        if (String(userId[i]['assigned_by_user']) != 'true')
          appointment['assigned_employees'].push(userId[i]);
      }
      updateQuery = {
        assigned_employees: appointment['assigned_employees'],
        level: 1,
      };
    }

    const updated_appointment = await this.appointmentModel.findOneAndUpdate(
      { _id: updateAppointmentDto.appointmentId },
      updateQuery,
      { timestamps: false, new: true },
    );

    if (updateQuery['status'] == 'Accepted') {
      const instance_update =
        await this.appointmentInstanceModel.findOneAndUpdate(
          {
            _id: updated_appointment['appointmentInstance'],
          },
          {},
          { new: true },
        );

      if (updated_appointment['online'] == true)
        if (
          Number(instance_update.attending_members) ==
          Number(appointment2['prestations'][0]['participantsNumber']) &&
          updated_appointment['online'] == true
        ) {
          const appointments_to_cancel = await this.appointmentModel.find({
            appointmentInstance: updated_appointment['appointmentInstance'],
            status: 'Pending',
            level: 0,
          });
          let payload = [];
          appointments_to_cancel.forEach(async (appointment) => {
            payload.push(
              this.cancelAppointment({ appointmentId: appointment._id }, user),
            );
          });
          Promise.all(payload);
        }
    }
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_FETCHED',
    };
  }
  async decideAppointments(decideAppointmentDto, user) {
    const { decision, appointmentId } = decideAppointmentDto;
    /* fetch the appointment */
    let appointment = await this.appointmentModel
      .findOne({
        _id: appointmentId,
      })
      .populate('appointmentMultiInstance');
    let appointment2 = await this.appointmentModel
      .findOne({
        _id: appointmentId,
      })
      .populate(['to', 'from']);
    if (decision == 'Refused') {
      appointment['level'] = 0;
      appointment['assigned_employees'] = appointment[
        'assigned_employees'
      ].filter((employee) => employee['assigned_by_user'] == true);
      let appointment2 = await this.appointmentModel
        .findOne({
          _id: appointmentId,
        })
        .populate(['to', 'from']);
      const usrRq = await this.userService.getUserById(user._id);
      if (user.role == privilege.EMPLOYEE) {
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.REFUSED_APPOINTEMENT_FOR_P,
            firstName: usrRq.data.firstName,
            lastName: usrRq.data.dlastName,
            badge: await this.notificationService.badge(appointment2.from._id),
          }),
          notification: REFUSED_APPOINTEMENT_FOR_P(
            await this.notificationService.badge(appointment2.from._id),
          ),
        };

        await onNotify(
          usrRq.data,
          appointment2.from,
          this.notificationService,
          message,
        );
        //**************************************************************************** */
      }
      //else if (user.role == privilege.CLIENT) {
      //   //! heeeeeeeeeeeeeeeeeeer
      //   for (let i = 0; i < appointment['assigned_employees'].length; i++) {
      //     const assigner = await this.userService.getUserById(
      //       appointment['assigned_employees'][i]['to'],
      //     );
      //     switch (assigner.data.type) {
      //       case privilege.PRO: {
      //         let message: NotificationMessage = {
      //           data: dataPayload({
      //             tag: notifTag.REFUSED_APPOINTEMENT_FOR_P,
      //             firstName: appointment2.from.firstName,
      //             start_date: appointment2.start_date.toISOString(),
      //           }),
      //           notification: REFUSED_APPOINTEMENT_FOR_P(
      //             await this.notificationService.badge(assigner.data._id),
      //           ),
      //         };

      //         await onNotify(
      //           usrRq.data,
      //           assigner.data,
      //           this.notificationService,
      //           message,
      //         );

      //         break;
      //       }
      //       case privilege.EMPLOYEE: {
      //         let message: NotificationMessage = {
      //           data: dataPayload({
      //             tag: notifTag.REFUSED_APPOINTEMENT_FOR_EMP,
      //             firstName: appointment2.from.firstName,
      //             start_date: appointment2.start_date.toISOString(),
      //           }),
      //           notification: REFUSED_APPOINTEMENT_FOR_E(
      //             await this.notificationService.badge(assigner.data._id),
      //           ),
      //         };

      //         await onNotify(
      //           usrRq.data,
      //           assigner.data,
      //           this.notificationService,
      //           message,
      //         );

      //         break;
      //       }
      //     }
      //   }

      //   //**************************************************************************** */
      // }
    }
    for (let i = 0; i < appointment['assigned_employees'].length; i++) {
      if (
        String(appointment['assigned_employees'][i]['to']) == String(user._id)
      ) {
        appointment['assigned_employees'][i]['accept_status'] = decision;
      }
    }
    const check_if_accepted = appointment['assigned_employees'].filter(
      (employee) => employee.accept_status != 'Accepted',
    );
    await appointment.save();
    if (
      decision == 'Accepted' &&
      appointment.multi_business == false &&
      appointment['online'] == false
    )
      await this.appointmentModel.updateMany(
        {
          _id: { $ne: appointmentId },
          'assigned_employees.to': user._id,
          start_date: { $lte: appointment['end_date'] },
          end_date: { $gte: appointment['start_date'] },
          status: 'Pending',
          level: 1,
          //...query
        },
        {
          'assigned_employees.$.accept_status': 'Refused',
          level: 0,
          status: 'Pending',
        },
      );
    if (check_if_accepted.length == 0 && decision == 'Accepted') {
      let appointmentMultiInstance = null;
      let appointmentInstance = null;
      if (appointment.multi_business == true) {
        /* create an appointment instance for multi busniss */
        appointmentMultiInstance =
          await this.appointmentBusinessInstanceModel.findOneAndUpdate(
            {
              start_date: appointment.start_date,
              end_date: appointment.end_date,
              prestation: appointment['prestations'],
              to: appointment.assigned_employees[0].to,
            },
            {
              $inc: { attending_members: 1 },
            },
            { upsert: true, new: true },
          );
        if (
          appointment.appointmentMultiInstance?.attending_members ==
          appointment['participantsNumber']
        )
          await this.appointmentModel.updateMany(
            {
              _id: { $ne: appointmentId },
              'assigned_employees.to': user._id,
              start_date: { $lte: appointment['end_date'] },
              end_date: { $gte: appointment['start_date'] },
              status: 'Pending',
              level: 1,
            },
            {
              'assigned_employees.$.accept_status': 'Refused',
              level: 0,
              status: 'Pending',
            },
          );
      }
      if (appointment['online'] == true) {
        appointmentInstance =
          await this.appointmentInstanceModel.findOneAndUpdate(
            {
              to: appointment2['assigned_employees'][0].to,
              start_date: appointment2.start_date,
              end_date: appointment2.end_date,
              prestation: appointment2.prestations[0]['_id'],
            },
            { $inc: { attending_members: 1 } },
            { upsert: true, new: true },
          );

        if (
          appointmentInstance?.attending_members ==
          appointment['participantsNumber']
        )
          await this.appointmentModel.updateMany(
            {
              _id: { $ne: appointmentId },
              'assigned_employees.to': user._id,
              start_date: { $lte: appointment['end_date'] },
              end_date: { $gte: appointment['start_date'] },
              status: 'Pending',
              level: 1,
            },
            {
              'assigned_employees.$.accept_status': 'Refused',
              level: 0,
              status: 'Pending',
            },
          );
      }
      const updated_appointment = await this.appointmentModel.findOneAndUpdate(
        { _id: appointmentId },
        {
          status: 'Accepted',
          appointmentInstance: appointmentInstance?._id,
          appointmentMultiInstance,
        },
      );

      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.ACCEPTED_APPOINTEMENT_FOR_C,
          firstName: appointment2.to.firstName,
          lastName: appointment2.to.lastName,
          companyName: appointment2.to.companyName,
          start_date: appointment2.start_date.toISOString(),
          badge: await this.notificationService.badge(appointment2.from._id),
        }),
        notification: ACCEPTED_APPOINTEMENT_FOR_C(
          await this.notificationService.badge(appointment2.from._id),
        ),
      };

      await onNotify(
        appointment2.to,
        appointment2.from,
        this.notificationService,
        message,
      );

      //**************************************************************************** */
    }

    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_UPDATED',
    };
  }

  async decidePostponeAppoitment(appointmentId, decision) {

    /*fetch appointment data */
    const appointment_update = await this.appointmentModel
      .findOneAndUpdate({ _id: appointmentId }, { status: decision })
      .populate('payment_id');
    if (decision == 'Refused' && appointment_update['appointmentInstance']) {
      await this.appointmentInstanceModel.findOneAndUpdate(
        {
          _id: appointment_update['appointmentInstance'],
          attending_members: { $gt: 0 },
        },
        { $inc: { attending_members: -1 } },
      );
    }

    if (
      decision == 'Refused' &&
      appointment_update['appointmentMultiInstance']
    ) {
      await this.appointmentBusinessInstanceModel.findOneAndUpdate(
        {
          _id: appointment_update['appointmentMultiInstance'],
          attending_members: { $gt: 0 },
        },
        { $inc: { attending_members: -1 } },
      );
    }

    if (decision == 'Refused') {
      await this.paymentService.createRefund(
        appointment_update['payment_id']['stripe_data']['data']['object']['id'],
        appointment_update.payment_id,
        appointment_update['total_amount'],
      );
    }
    return { statusCode: 200, message: 'API.APPOINTMENTS_UPDATED' };
  }

  async handleNoShow(user, appointment_data) {
    const duration = moment(appointment_data.start_date).diff(
      moment(),
      'hours',
    );
    // handle no show before 24h

    if (duration >= 24) {
      await this.paymentService.createRefund(
        appointment_data?.['payment_id']['stripe_data']['data']['object']['id'],
        appointment_data.payment_id,
        appointment_data.total_amount + 100,
        true,
        true,
      );
    } else {
      const appointment = await appointment_data.populate(['from', 'to']);
      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.NO_SHOW_PASS,
          firstName: appointment.from.firstName,
          lastName: appointment.from.lastName,
          companyName: appointment.from.companyName,
          appointmentId: appointment_data._id,
          start_date: appointment_data.start_date.toISOString(),
          badge: await this.notificationService.badge(appointment.to._id),
        }),
        notification: NO_SHOW_PASS(
          await this.notificationService.badge(appointment.to._id),
        ),
      };

      await onNotify(
        appointment.from,
        appointment.to,
        this.notificationService,
        message,
      );
      /! send notification to pro to decide about the noshow */;
      // const amout_to_user_refund = (appointment_data.total_amount*0.7)-80
      // await this.paymentService.createRefundAmount(
      //   appointment_data?.['payment_id']['stripe_data']['data']['object']['id'],
      //   appointment_data.payment_id,
      //   amout_to_user_refund
      // );
    }
  }

  async handleNoShowNotif(appointmentId, decision, idNotif: string) {
    let appointment_data = await this.appointmentModel
      .findOne({ _id: appointmentId })
      .populate('payment_id');
    if (String(decision) == 'false') {
      //! delete notif
      await this.paymentService.createRefundAmount(
        appointment_data?.['payment_id']['stripe_data']['data']['object']['id'],
        appointment_data.payment_id,
        appointment_data['total_amount'],
      );
      await this.notificationService.deleteNotification(idNotif);
    } else {
      //! delete notif
      await this.paymentService.createRefundAmount(
        appointment_data?.['payment_id']['stripe_data']['data']['object']['id'],
        appointment_data.payment_id,
        Math.floor(appointment_data['total_amount'] * 0.7),
        true,
      );
      await this.walletService.updateWallet(appointment_data['to']._id, {
        $inc: { amount: appointment_data['total_amount'] * 0.3 },
      });
      for (let i = 0; i < appointment_data.assigned_employees.length; i++)
        await this.userService.UpdateUserById(
          appointment_data.assigned_employees[i].to,
          {
            $inc: { ca: (appointment_data['total_amount'] * 0.3) / 100 },
          },
        );
      await this.notificationService.deleteNotification(idNotif);
    }
    let query;
    if (decision == 'false') query = { no_show: false };
    else
      query = {
        no_show: true,
        total_amount: appointment_data['total_amount'] * 0.3,
      };

    await this.appointmentModel.findOneAndUpdate({ _id: appointmentId }, query);
    await this.notificationService.deleteNotification(idNotif);
    return { statusCode: 200, message: 'API.APPOINTMENTS_CANCELED' };
  }

  async handleNoShowPro(appointmentId, user) {
    let appointment_data = await this.appointmentModel
      .findOneAndUpdate(
        { _id: appointmentId },
        { status: 'Canceled', canceled_by: user._id, no_show: true },
      )
      .populate('payment_id');
    await this.appointmentModel.findOneAndUpdate(
      { _id: appointmentId },
      { total_amount: appointment_data['total_amount'] * 0.3 },
    );
    if (String(appointment_data.no_show) == 'true')
      throw new HttpException('NO SHOW ALREADY SENT', HttpStatus.FORBIDDEN);
    //! if user type emp => notification sender emp to pro
    const me = await this.userService.findUserBy({ _id: user._id });
    const notifTarget = await this.userService.findUserBy({
      _id: appointment_data.to,
    });
    if (me.type == privilege.EMPLOYEE) {
      //! send notif
      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.NO_SHOW_REQUEST,
          firstName: me.firstName,
          appointmentId:appointmentId,
          lastName: me.lastName,
          start_date: appointment_data.start_date.toISOString(),
          badge: await this.notificationService.badge(notifTarget._id),
        }),
        notification: NO_SHOW_REQUEST(
          await this.notificationService.badge(notifTarget._id),
        ),
      };

      await onNotify(me, notifTarget, this.notificationService, message);
      return apiReturner(HttpStatus.OK, SUCCEEDED);
    }
    await this.paymentService.createRefundAmount(
      appointment_data?.['payment_id']['stripe_data']['data']['object']['id'],
      appointment_data.payment_id,
      appointment_data['total_amount'] * 0.7,
      true,
    );
    await this.walletService.updateWallet(appointment_data['to']._id, {
      $inc: { amount: appointment_data['total_amount'] * 0.3 },
    });
    for (let i = 0; i < appointment_data.assigned_employees.length; i++)
      await this.userService.UpdateUserById(
        appointment_data.assigned_employees[i].to,
        {
          $inc: { ca: (appointment_data['total_amount'] * 0.3) / 100 },
        },
      );
    return apiReturner(HttpStatus.OK, SUCCEEDED);
  }

  async cancelAppointment(cancelAppointmentDto, user) {
    await this.thnextModel.deleteMany({appointment:cancelAppointmentDto.appointmentId})

    const appointment_data = await this.appointmentModel
      .findOneAndUpdate(
        { _id: cancelAppointmentDto.appointmentId },
        { status: 'Canceled', canceled_by: user._id },
      )
      .populate('payment_id')
      .populate({ path: 'to', populate: { path: 'subscription' } })
      .populate('from');
    if (appointment_data.from.type == 'EXTERNAL')
      return { statusCode: 200, message: 'API.APPOINTMENTS_CANCELED' };
    await this.notificationService.deleteNotifcationQuery({
      'data.appointmentId': cancelAppointmentDto.appointmentId,
    });
    if (appointment_data['appointmentInstance'])
      await this.appointmentInstanceModel.findOneAndUpdate(
        {
          _id: appointment_data['appointmentInstance'],
          attending_members: { $gt: 0 },
        },
        { $inc: { attending_members: -1 } },
      );
    if (appointment_data['appointmentMultiInstance'])
      await this.appointmentBusinessInstanceModel.findOneAndUpdate(
        {
          _id: appointment_data['appointmentMultiInstance'],
          attending_members: { $gt: 0 },
        },
        { $inc: { attending_members: -1 } },
      );
    if (
      user.role == 'CLIENT' &&
      appointment_data.to.subscription.fonctionality.no_show == true
    )
      await this.handleNoShow(appointment_data?.to, appointment_data);
    else {
      const duration = moment(appointment_data.start_date).diff(
        moment(),
        'hours',
      );
      // handle no show before 24h

      if (duration >= 24 && user.role == 'CLIENT') {
        await this.paymentService.createRefund(
          appointment_data?.['payment_id']['stripe_data']['data']['object'][
            'id'
          ],
          appointment_data.payment_id,
          +appointment_data['total_amount'] + 100,
          true,
          user.role == privilege.CLIENT ? true : false,
        );
      } else {
        if (user.role == 'CLIENT') {
          await this.paymentService.createRefund(
            appointment_data?.['payment_id']['stripe_data']['data']['object'][
              'id'
            ],
            appointment_data.payment_id,
            +appointment_data['total_amount'],
            false,
            user.role == privilege.CLIENT ? true : false,
          );
        }
      }
      if (user.role == 'PRO') {
        await this.paymentService.createRefund(
          appointment_data?.['payment_id']['stripe_data']['data']['object'][
            'id'
          ],
          appointment_data.payment_id,
          +appointment_data['total_amount'] + 100,
          true,
          user.role == privilege.CLIENT ? true : false,
        );
      }
    }
    //!Notif
    const usr = await this.userService.getUserById(user._id);
    await this.userService.updateServices(user._id, {
      appointmentStatCanTryNumber: Number(
        usr.data.appointmentStatCanTryNumber
          ? usr.data.appointmentStatCanTryNumber + 1
          : 0 + 1,
      ),
    });
    // const whocancel = await this.userService.getUserById(user._id);

    //! Ntf
    const appointmentdata = await this.appointmentModel
      .findOne({ _id: cancelAppointmentDto.appointmentId })
      .populate(['from', 'to', 'canceled_by']);
    switch (appointmentdata.canceled_by.type) {
      case privilege.PRO: {
        console.log('cancel pro');

        await this.checkApointemntStatLimit(
          usr.data,
          appointStatus.CANCLED_APPOINTEMENT,
        );
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.CANCLED_APPOINTEMENT_FOR_C,
            firstName: appointmentdata.canceled_by.firstName,
            lastName: appointmentdata.canceled_by.lastName,
            companyName: appointmentdata.canceled_by.companyName,
            start_date: appointmentdata.start_date.toISOString(),
            badge: await this.notificationService.badge(
              appointmentdata.from._id,
            ),
          }),
          notification: CANCLED_APPOINTEMENT_FOR_C(
            await this.notificationService.badge(appointmentdata.from._id),
          ),
        };

        await onNotify(
          appointmentdata.canceled_by,
          appointmentdata.from,
          this.notificationService,
          message,
        );

        //**************************************************************************** */

        break;
      }
      case privilege.CLIENT: {
        console.log('inside client --------------');

        await this.checkApointemntStatLimit(
          usr.data,
          appointStatus.CANCLED_APPOINTEMENT,
        );
        const duration = moment(appointment_data.start_date).diff(
          moment(),
          'hours',
        );
        console.log('duration', duration);
        console.log(appointmentdata.assigned_employees);

        appointmentdata.assigned_employees.map(async (data: any) => {
          const assigner = await this.userService.findUserByAndPopSub({
            _id: data.to,
          });

          if (assigner.type == privilege.PRO) {
            console.log('assigner is a pro');
            if (
              assigner?.subscription?.fonctionality?.no_show.toString() ==
              'true' &&
              duration <= 24
            ) {
              console.log('no cancel notif to pro');
            } else {
              //! normal send of notification
              let message: NotificationMessage = {
                data: dataPayload({
                  tag: notifTag.CANCLED_APPOINTEMENT_FOR_P,
                  firstName: appointmentdata.canceled_by.firstName,
                  lastName: appointmentdata.canceled_by.lastName,
                  start_date: appointmentdata.start_date.toISOString(),
                  badge: await this.notificationService.badge(assigner._id),
                }),

                notification: CANCLED_APPOINTEMENT_FOR_P(
                  await this.notificationService.badge(assigner._id),
                ),
              };
              console.log(
                'notif to from noshow ',
                assigner.type,
                'by client who cancel appoint',
              );

              await onNotify(
                appointmentdata.canceled_by,
                assigner,
                this.notificationService,
                message,
              );
            }
          } else if (assigner.type == privilege.EMPLOYEE) {
            //! type emp
            let message: NotificationMessage = {
              data: dataPayload({
                tag: notifTag.CANCLED_APPOINTEMENT_FOR_EMP,
                firstName: appointmentdata.canceled_by.firstName,
                lastName: appointmentdata.canceled_by.lastName,
                start_date: appointmentdata.start_date.toISOString(),
                badge: await this.notificationService.badge(assigner._id),
              }),

              notification: CANCLED_APPOINTEMENT_FOR_EMP(
                await this.notificationService.badge(assigner._id),
              ),
            };
            console.log(
              'notif to ',
              assigner.type,
              'by client who cancel appoint',
            );

            await onNotify(
              appointmentdata.canceled_by,
              assigner,
              this.notificationService,
              message,
            );
          }

          //**************************************************************************** */
        });
        break;
      }

      case privilege.EMPLOYEE: {
        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.CANCLED_APPOINTEMENT_FOR_C,
            firstName: appointmentdata.to.firstName,
            lastName: appointmentdata.to.lastName,
            companyName: appointmentdata.to.companyName,
            start_date: appointmentdata.start_date.toISOString(),
            badge: await this.notificationService.badge(
              appointmentdata.from._id,
            ),
          }),

          notification: CANCLED_APPOINTEMENT_FOR_C(
            await this.notificationService.badge(appointmentdata.from._id),
          ),
        };

        await onNotify(
          appointmentdata.to,
          appointmentdata.from,
          this.notificationService,
          message,
        );

        //**************************************************************************** */

        break;
      }
    }
    return { statusCode: 200, message: 'API.APPOINTMENTS_CANCELED' };
  }

  async findOne(_id: string) {
    const data = await this.appointmentModel
      .findOne({ _id })
      .populate('from')
      .populate('assigned_employees')
      .populate('company');
    return data;
  }
  async findOneController(_id: string) {
    const data = await this.appointmentModel
      .findOne({ _id })
      .populate('from')
      .populate('assigned_employees.to')
      .populate('company');
    return { statusCode: 200, message: 'API.APPOINTMENTS_FETCHED', data };
  }

  update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    return `This action updates a #${id} appointment`;
  }

  remove(id: number) {
    return `This action removes a #${id} appointment`;
  }

  async searchForApointmentForClient(
    userId: string,
    page_number: number,
    page_size: number,
    toSearch: string,
  ) {
    var mongoose = require('mongoose');
    var castedUserId = mongoose.Types.ObjectId(userId);
    const appointmentLength = (
      await this.appointmentModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: '$to' },
        {
          $match: {
            $and: [
              { 'to._id': castedUserId },
              {
                $or: [
                  {
                    description: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.email': {
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
    const appointments = await this.appointmentModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'to',
        },
      },
      { $unwind: '$to' },
      {
        $match: {
          $and: [
            { from: castedUserId },
            {
              $or: [
                {
                  'to.firstName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'to.lastName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'to.email': {
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
      { $sort: { firstName: 1 } },
    ]);
    return {
      appointments,
      appointmentLength,
    };
  }

  async fetchNextAppointment(user) {
    if (user.role == 'PRO' || user.role == 'EMPLOYEE')
      return await this.appointmentModel
        .findOne({
          assigned_employees: {
            $elemMatch: {
              to: user._id,
              accept_status: 'Accepted',
            },
          },
          status: 'Accepted',
          started: false,
          finished: false,
          end_date: { $gte: moment().utc() },
        })
        .populate('from')
        .populate({ path: 'to', populate: { path: 'relatedCompany' } })
        .populate('prestations')
        .populate('company')
        .sort({ start_date: 1 });
    else
      return this.appointmentModel
        .findOne({
          from: user._id,
          status: 'Accepted',
          finished: false,
          started: false,
        })
        .populate('from')
        .populate({ path: 'to', populate: { path: 'relatedCompany' } })
        .populate('prestations')
        .populate('company')
        .sort({ start_date: 1 });
  }

  async fetchNextAppointmentRequest(user) {
    if (user.role == 'PRO')
      return this.appointmentModel
        .findOne({ to: user._id, status: 'Pending', level: 0, active: true })
        .populate('from')
        .populate({ path: 'to', populate: { path: 'relatedCompany' } })
        .populate('prestations')
        .populate('company')
        .sort({ createdAt: 1 });
    else
      return this.appointmentModel
        .findOne({
          level: 1,
          active: true,
          assigned_employees: {
            // @ts-ignore
            $elemMatch: {
              // @ts-ignore
              to: new mongoose.Types.ObjectId(user._id),
              accept_status: 'Pending',
            },
          },
        })
        .populate('from')
        .populate({ path: 'to', populate: { path: 'relatedCompany' } })
        .populate('prestations')
        .populate('company')
        .sort({ createdAt: 1 });
  }

  async findMyAppointmentsWaleed(page_size, page_number, user, search) {
    let query;
    if (!search) search = '';
    if (user.role == 'PRO') {
      const cond = {
        // @ts-ignore
        'to._id': new mongoose.Types.ObjectId(user._id),
        status: 'Pending',
        level: 0,
        active: true      };
      query = [
        {
          $lookup: {
            from: 'companies',
            localField: 'company',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: '$to' },
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
          $lookup: {
            from: 'prestations',
            localField: 'prestations',
            foreignField: '_id',
            as: 'prestations',
          },
        },
        {
          $match: {
            $and: [
              cond,
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
                ],
              },
            ],
          },
        },

        {
          $project: {
            from: 1,
            active: 1,
            'to._id': 1,
            appointmentInstance: 1,
            assigned_employees: 1,
            at_business: 1,
            at_home: 1,
            company: 1,
            createdAt: 1,
            duration: 1,
            end_date: 1,
            finished: 1,
            level: 1,
            online: 1,
            payment_id: 1,
            prestations: 1,
            started: 1,
            start_date: 1,
            status: 1,
            total_amount: 1,
            updatedAt: 1,
            _id: 1,
          },
        },
      ];
    } else {
      console.log('from client here');
      const cond = {
        $and: [
          // @ts-ignore
          { 'from._id': new mongoose.Types.ObjectId(user._id) },
          {
            $or: [
              { status: 'PostPoned' },
              { status: 'Accepted' },
              { status: 'Pending' },
            ],
          },
          
        ],
      };
      query = [
        {
          $lookup: {
            from: 'companies',
            localField: 'company',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
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
            from: 'prestations',
            localField: 'prestations',
            foreignField: '_id',
            as: 'prestations',
          },
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'to.relatedCompany',
            foreignField: '_id',
            as: 'to.relatedCompany',
          },
        },
        { $unwind: { path: '$to.relatedCompany' } },

        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: '$from' },
        {
          $match: {
            $and: [
              cond,
              {
                $or: [
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ['$to.firstName', ' ', '$to.lastName'],
                        },
                        regex: new RegExp(`${search}`),
                        options: 'i',
                      },
                    },
                    //633d93eb896cf17409b0c8c0
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
                    'to.email': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.companyName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.relatedCompany.companyName': {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
        // {
        //   $lookup: {
        //     from: 'users',
        //     localField: 'from',
        //     foreignField: '_id',
        //     as: 'from',
        //   },
        // },
        // { $unwind: '$from' },
        {
          $project: {
            active: 1,
            from: 1,
            appointmentInstance: 1,
            assigned_employees: 1,
            at_business: 1,
            at_home: 1,
            company: 1,
            createdAt: 1,
            duration: 1,
            end_date: 1,
            finished: 1,
            level: 1,
            online: 1,
            payment_id: 1,
            prestations: 1,
            started: 1,
            start_date: 1,
            status: 1,
            to: 1,
            total_amount: 1,
            updatedAt: 1,
            _id: 1,
          },
        },
      ];
    }
    const appointments = await this.appointmentModel.aggregate([
      ...query,
      { $sort: { start_date: 1 } },
      { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);

    const total = await this.appointmentModel.aggregate([...query]);
    console.log('appointments', appointments.length);
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_FETCHED',
      data: appointments,
      page_number,
      page_size,
      total_attributs: total.length,
      total_appointments: total.length,
      total_devis: 0,
    };
  }
  countAppointmentService(proId: string) {
    return this.appointmentModel
      .find({
        to: proId,
        level:0,
        status: 'Pending',
        active: true,
      })
      .count();
  }
  async startAppointment(startAppointmentDto, user) {
    const { appointmentId } = startAppointmentDto;
    let twilio_data = {};
    const find_appointment_data = await this.appointmentModel
      .findOne({ _id: appointmentId })
      .populate('appointmentInstance')
      .populate('appointmentMultiInstance');
    if (find_appointment_data['online'] == true) {
      /* create twilio room */
      if (!find_appointment_data['appointmentInstance']['twilio_data']) {
        twilio_data = await createTwilioRoom(
          String(find_appointment_data['appointmentInstance']['_id']),
        );
        twilio_data = { data: JSON.parse(JSON.stringify(twilio_data)) };
        console.log(find_appointment_data['appointmentInstance']['_id']);
        await this.appointmentInstanceModel.findOneAndUpdate(
          {
            _id: find_appointment_data['appointmentInstance']['_id'],
          },
          { twilio_data: twilio_data },
        );
      }
      await this.appointmentModel.updateMany(
        {
          appointmentInstance:
            find_appointment_data['appointmentInstance']['_id'],
        },
        { started: true, startedAt: new Date() },
        { timestamps: false },
      );
    }

    if (find_appointment_data['multi_business'] == true) {
      /* create twilio room */
      // if (!find_appointment_data['appointmentMultiInstance']['twilio_data']) {
      //   twilio_data = await createTwilioRoom(
      //     String(find_appointment_data['appointmentMultiInstance']['_id']),
      //   );
      //   twilio_data = { data: JSON.parse(JSON.stringify(twilio_data)) };
      //   console.log(find_appointment_data['appointmentMultiInstance']['_id']);
      //   await this.appointmentBusinessInstanceModel.findOneAndUpdate(
      //     {
      //       _id: find_appointment_data['appointmentMultiInstance']['_id'],
      //     },
      //     { twilio_data: twilio_data },
      //   );
      // }
      await this.appointmentModel.updateMany(
        {
          appointmentMultiInstance:
            find_appointment_data['appointmentMultiInstance']['_id'],
        },
        { started: true, startedAt: new Date() },
        { timestamps: false },
      );
    }

    const rest = await this.appointmentModel.findOneAndUpdate(
      { _id: appointmentId },
      { started: true, startedAt: new Date() },
      { timestamps: false },
    );
    const Pusher = require('pusher');
    const pusher = new Pusher({
      appId: process.env.pusher_appId,
      key: process.env.pusher_key,
      secret: process.env.pusher_secret,
      cluster: process.env.pusher_cluster,
      useTLS: process.env.pusher_userTLS,
    });
    if (find_appointment_data.multi_business == true)
      await pusher.trigger(
        String(find_appointment_data['appointmentMultiInstance']['_id']),
        'appointmentStarted',
        {
          message: 'appointment started by pro',
        },
      );
    if (find_appointment_data['online'] == true)
      await pusher.trigger(
        String(find_appointment_data['appointmentInstance']['_id']),
        'appointmentStarted',
        {
          message: 'appointment started by pro',
        },
      );
    if (
      find_appointment_data['online'] == false &&
      find_appointment_data.appointmentMultiInstance == false
    )
      await pusher.trigger(
        String(find_appointment_data['_id']),
        'appointmentStarted',
        {
          message: 'appointment started by pro',
        },
      );
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_STARTED',
      data: twilio_data,
    };
  }

  async endAppointment(endAppointmentDto, user) {
    try {
      const Pusher = require('pusher');
      const pusher = new Pusher({
        appId: process.env.pusher_appId,
        key: process.env.pusher_key,
        secret: process.env.pusher_secret,
        cluster: process.env.pusher_cluster,
        useTLS: process.env.pusher_userTLS,
      });

      const { appointmentId } = endAppointmentDto;
      const appointment = await this.appointmentModel
        .findOneAndUpdate({ _id: appointmentId }, { finished: true })
        .populate('from')
        .populate('appointmentInstance')
        .populate('to');
      if (appointment['finished'] == true)
        return {
          statusCode: 200,
          message: 'API.APPOINTMENTS_ENDED',
          data: [],
        };
      let query = {};
      if (appointment['online'] == true) {
        query = {
          appointmentInstance: appointment['appointmentInstance']['_id'],
        };
      }
      if (appointment['multi_business'] == true)
        query = {
          appointmentMultiInstance: appointment['appointmentMultiInstance'],
        };
      if (
        appointment['online'] == false &&
        appointment['multi_business'] == false
      )
        query = { _id: appointmentId };
      await this.appointmentModel.updateMany(
        query,
        { finished: true },
        { timestamps: false },
      );
      const appointmentInstances = await this.appointmentModel.find(query);
      let promise_array = [];
      if (appointment.from.type != 'EXTERNAL') {
        const payment_to_pro = appointment['total_amount'];
        await this.walletService.updateWallet(appointment['to']._id, {
          $inc: { amount: payment_to_pro },
        });
        let check_pro = true;
        for (let i = 0; i < appointment['assigned_employees'].length; i++) {
          if (
            String(appointment['assigned_employees'][i].to) ==
            String(appointment.to._id)
          )
            check_pro = false;
          promise_array.push(
            this.userService.UpdateUserById(
              appointment['assigned_employees'][i].to,
              {
                $inc: { ca: payment_to_pro / 100 },
              },
            ),
          );
        }
        if (check_pro)
          promise_array.push(
            this.userService.UpdateUserById(appointment.to, {
              $inc: { ca: payment_to_pro / 100 },
            }),
          );
        // await this.paymentService.transfertPayment(
        //   payment_to_pro,
        //   appointment['to'],
        // );
      }
      await Promise.all(promise_array);
      if (String(appointment['online']) == 'true') {
        // const res = await closeTwilioRoom(
        //   appointment['appointmentInstance']['twilio_data']['data']['sid'],
        // );
        await pusher.trigger(
          String(appointment['appointmentInstance']['_id']),
          'callended',
          {
            message: 'callended by pro',
          },
        );
      }
      if (appointment['multi_business'] == true) {
        await pusher.trigger(
          String(appointment.appointmentMultiInstance),
          'appointmentEnded',
          {
            message: 'callended by pro',
          },
        );
      }

      if (
        appointment['multi_business'] == false &&
        String(appointment['online']) == 'false'
      ) {
        await pusher.trigger(String(appointmentId), 'appointmentEnded', {
          message: 'callended by pro',
        });
      }
      for (let i = 0; i < appointmentInstances.length; i++)
        await this.userService.createClientShip(
          user,
          String(appointmentInstances[i].from),
        );
      //!!!!!!!!!!!  assign...
      if (
        appointment.assigned_employees &&
        appointment.assigned_employees.length > 0
      ) {
        appointment.assigned_employees.map(async (data) => {
          console.log(data);

          const user = await this.userService.getUserById(data.to);
          console.log(user.data._id);
          if (user?.data?.type && user.data.type != privilege.PRO) {
            let messageTe: NotificationMessage = {
              data: dataPayload({
                tag: notifTag.APPOINTMENT_FINISHED_FOR_EMP,
                firstName: appointment.from.firstName,
                lastName: appointment.from.lastName,
                companyName: appointment.from.companyName,
                start_date: appointment.start_date.toISOString(),
              }),
              notification: APPOINTMENT_FINISHED_FOR_EMP(
                await this.notificationService.badge(user.data._id),
              ),
            };
            await onNotify(
              appointment.from,
              user.data,
              this.notificationService,
              messageTe,
            );
          }
        });
      }

      let messageTc: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.APPOINTMENT_FINISHED_FOR_CLIENT,
          firstName: appointment.to.firstName,
          lastName: appointment.to.lastName,
          companyName: appointment.to.companyName,
          start_date: appointment.start_date.toISOString(),
        }),
        notification: APPOINTMENT_FINISHED_FOR_CLIENT(
          await this.notificationService.badge(appointment.from._id),
        ),
      };
      let messageTp: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.APPOINTMENT_FINISHED_FOR_PRO,
          firstName: appointment.from.firstName,
          lastName: appointment.from.lastName,
          companyName: appointment.from.companyName,
          start_date: appointment.start_date.toISOString(),
        }),
        notification: APPOINTMENT_FINISHED_FOR_PRO(
          await this.notificationService.badge(appointment.to._id),
        ),
      };

      await onNotify(
        appointment.to,
        appointment.from,
        this.notificationService,
        messageTc,
      );
      await onNotify(
        appointment.from,
        appointment.to,
        this.notificationService,
        messageTp,
      );

      return {
        statusCode: 200,
        message: 'API.APPOINTMENTS_ENDED',
        data: [],
      };
    } catch (err) {
      throw new HttpException(err, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async takeExternalAppointment(externalAppointmentDto, user) {
    let {
      client_name,
      assigned_employees,
      prestationId,
      at_home,
      at_business,
      start_date,
      comments,
    } = externalAppointmentDto;
    let level = 0;
    /* check if the assigned is available */
    const available_employees = await this.fetchAvailableEmployeeExternal(externalAppointmentDto,user);
    for(let i=0 ; i< assigned_employees.length ; i++){
      if (!available_employees.data.some(e => e._id == assigned_employees[i]))
        throw new HttpException('ASSIGNED IN UNAVAILABLE',HttpStatus.FORBIDDEN)
    }
    /* create an external user */
    const created_external_user = await this.userService.createExternalUser({
      firstName: client_name,
      type: 'EXTERNAL',
      email: uuidv4() + '@mail.com',
      referralCode: uuidv4(),
    });
    /* check if i assigned my self */
    for (let i = 0; i < assigned_employees.length; i++) {
      if (assigned_employees[i] == user._id)
        assigned_employees[i] = {
          to: assigned_employees[i],
          accept_status: 'Accepted',
          assigned_by_user: false,
        };
      else
        assigned_employees[i] = {
          to: assigned_employees[i],
          accept_status: 'Pending',
          assigned_by_user: false,
        };
    }
    let status = 'Pending';
    if (assigned_employees.length == 1 && assigned_employees[0].to == user._id)
      status = 'Accepted';
    else level = 1;
    /* calculate end date */
    const companyData = await this.companyService.getCompanyByUserId(user._id);
    const { duration, end_date, duration_without_break, break_duration } =
      await this.prestationService.calculateAppointmentEndDate(
        prestationId,
        user,
        start_date,
      );
    /* create the appointment*/
    await this.appointmentModel.create({
      from: created_external_user._id,
      to: user._id,
      company: companyData._id,
      start_date,
      end_date,
      assigned_employees,
      at_home,
      at_business,
      comments,
      duration,
      prestations: prestationId,
      active: true,
      status,
      duration_without_break,
      break: break_duration,
      level,
    });
    return {
      statusCode: 201,
      message: 'API.APPOINTMENTS_CREATED',
      data: [],
    };
  }

  async fetchAvailableEmployeeExternal(fetchAvailibilityDto, user) {
    const { at_home, at_business } = fetchAvailibilityDto;
    const companyData = await this.companyService.getCompanyByUserId(user._id);
    let employees = companyData['employees'];
    /* fetch current user data */
    const owner_data = await this.userService.findUserByWithPopulatedAgenda({
      _id: user._id,
    });
    employees.push(owner_data);
    const fetch_appointments = await this.prestationService.findWithQuery({
      _id: { $in: fetchAvailibilityDto.prestation },
    });
    let prestation_duration = 0;
    for (let i = 0; i < fetch_appointments.length; i++) {
      if (i == 0) {
        prestation_duration += Number(companyData['break_duration_in_minutes']);
      }
      prestation_duration += Number(fetch_appointments[i]['duration']);
    }
    const end_date = new Date(
      new Date(fetchAvailibilityDto['start_date']).getTime() +
      prestation_duration * 60000,
    );
    employees = await this.filterEmployees(
      employees,
      fetchAvailibilityDto['start_date'],
      end_date,
      at_home,
      at_business,
      companyData['break_duration_in_minutes'],
    );

    let new_employees = await this.fetchAvailableEmployeeFunc(
      employees,
      fetchAvailibilityDto['start_date'],
      end_date,
    );
    return {
      statusCode: 200,
      message: 'API.USERS_FETCHED',
      data: new_employees,
    };
  }

  async filterEmployees(
    employees,
    start_date,
    end_date,
    at_home,
    at_business,
    breakDuration,
  ) {
    employees = employees.filter((employee) => {
      const condition_on_availabilty = employee.available == true;
      const condition_on_vacation = employee?.userAgenda?.vacation_from
        ? new Date(employee?.userAgenda?.vacation_from) >= new Date(end_date) ||
          new Date(employee?.userAgenda?.vacation_to) <= new Date(start_date)
        : true;

      /* variables updates*/
      let my_day = new Date(start_date).getDay();
      // to handle flutter
      if (my_day == 0) my_day = 6;
      else my_day -= 1;
      start_date = new Date(start_date);
      let is_day =
        start_date <=
        new Date(
          `${start_date.getFullYear()}-${start_date.getMonth() + 1
          }-${start_date.getDate()} 11:59:59`,
        );
      console.log(
        'is_day ',
        new Date(
          `${start_date.getFullYear()}-${
            start_date.getMonth() + 1
          }-${start_date.getDate()} 12:58:59`,
        ),
      );
      console.log('compare ',new Date(
          `${start_date.getFullYear()}-${
            start_date.getMonth() + 1
          }-${start_date.getDate()} 12:58:59`,
        ))
      console.log('start_date ', start_date);
      const current_time_end = this.convertDateToStanderdTime(
        new Date(end_date),
      );
      const current_time_start = this.convertDateToStanderdTime(start_date);
      const end_time_without_break = moment(end_date)
        .subtract(Number(breakDuration), 'minutes')
        .utc()
        .toDate();
      const current_time_end_without_break = this.convertDateToStanderdTime(
        new Date(end_time_without_break),
      );

      /* checking if will be available whole day*/
      const difference_day_afternoon = moment(
        employee?.userAgenda?.hours[my_day]?.mid_day_from_hours,
      ).diff(employee?.userAgenda?.hours[my_day]?.day_to_hours, 'minutes');

      if (
        employee.userAgenda != undefined &&
        difference_day_afternoon <= 5 &&
        (employee.userAgenda?.hours[my_day].day_outside ==
          employee?.userAgenda?.hours[my_day].mid_day_outside ||
          employee.userAgenda?.hours[my_day].day_home ==
            employee?.userAgenda?.hours[my_day].mid_day_home)
      ) {
        is_day = true;
        employee.userAgenda.hours[my_day].day_to_hours =
          employee.userAgenda.hours[my_day].mid_day_to_hours;
      }
      /* ***************** */
      const condition_on_working_time_day =
        employee?.userAgenda?.hours[my_day]?.day == is_day &&
        current_time_end <=
          new Date(employee?.userAgenda?.hours[my_day]?.day_to_hours.toISOString().slice(0, -1)) &&
        current_time_start >=
          new Date(employee?.userAgenda?.hours[my_day]?.day_from_hours.toISOString().slice(0, -1)) &&
        (employee.userAgenda?.hours[my_day].day_outside == at_home ||
          employee.userAgenda?.hours[my_day].day_home == at_business);

      const condition_on_working_time_afternoon =
        employee?.userAgenda?.hours[my_day]?.mid_day == !is_day &&
        current_time_end <=
          new Date(employee?.userAgenda?.hours[my_day]?.mid_day_to_hours.toISOString().slice(0, -1)) &&
        current_time_start >=
          new Date(employee?.userAgenda?.hours[my_day]?.mid_day_from_hours.toISOString().slice(0, -1)) &&
        (employee?.userAgenda?.hours[my_day].mid_day_outside == at_home ||
          employee?.userAgenda?.hours[my_day].mid_day_home == at_business);

      const condition_on_edge_day =
        employee?.userAgenda?.hours[my_day]?.day == is_day &&
        current_time_end >
          new Date(employee?.userAgenda?.hours[my_day]?.day_to_hours.toISOString().slice(0, -1)) &&
        current_time_end_without_break <=
          new Date(employee?.userAgenda?.hours[my_day]?.day_to_hours.toISOString().slice(0, -1)) &&
        current_time_start >=
          new Date(employee?.userAgenda?.hours[my_day]?.day_from_hours.toISOString().slice(0, -1)) &&
        (employee.userAgenda?.hours[my_day].day_outside == at_home ||
          employee.userAgenda?.hours[my_day].day_home == at_business);

      const condition_on_edge_afternoon =
        employee?.userAgenda?.hours[my_day]?.mid_day == !is_day &&
        current_time_end >
          new Date(employee?.userAgenda?.hours[my_day]?.mid_day_to_hours.toISOString().slice(0, -1)) &&
        current_time_end_without_break <=
          new Date(employee?.userAgenda?.hours[my_day]?.mid_day_to_hours.toISOString().slice(0, -1)) &&
        current_time_start >=
          new Date(employee?.userAgenda?.hours[my_day]?.mid_day_from_hours.toISOString().slice(0, -1)) &&
        (employee?.userAgenda?.hours[my_day].mid_day_outside == at_home ||
          employee?.userAgenda?.hours[my_day].mid_day_home == at_business);
      /* return result */
      console.log("condition_status ",condition_on_working_time_afternoon);
      console.log(
        'condition day ',
        employee?.userAgenda?.hours[my_day]?.day == !is_day,
      );
      console.log(
        'condition_activity ',
        employee?.userAgenda?.hours[my_day].mid_day_outside == at_home ||
          employee?.userAgenda?.hours[my_day].mid_day_home == at_business,
      );
      console.log(
        'condition_afternoon ',
        current_time_start >=
          new Date(employee?.userAgenda?.hours[my_day]?.mid_day_from_hours),
      );
      console.log('current_time_start ', current_time_start);
      console.log(
        'time employee ',
        new Date(employee?.userAgenda?.hours[my_day]?.mid_day_from_hours),
      );
      return (
        condition_on_availabilty &&
        condition_on_vacation &&
        (condition_on_working_time_day ||
          condition_on_working_time_afternoon ||
          condition_on_edge_day ||
          condition_on_edge_afternoon)
      );
    });
    return employees;
  }

  convertDateToStanderdTime(date) {
    return new Date(`2001-01-01 ${date.toLocaleTimeString([])}`);
  }

  convertTimeToCurrentDay(date) {
    return new Date(
      `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 12:59:59`,
    );
  }

  async fetchAgenda(fetchAgendaDto, user) {
    const { start_date, end_date, employeeId } = fetchAgendaDto;
    let query = {
      start_date: { $gte: new Date(start_date) },
      end_date: { $lte: new Date(end_date) },
      $or: [{ status: 'Accepted' }, { no_show: true }],
    };
    if (user.role == 'CLIENT')
      //@ts-ignore
      query['from'] = new mongoose.Types.ObjectId(user._id);

    if (user.role == 'EMPLOYEE') {
      query['assigned_employees'] = {
        // @ts-ignore
        $elemMatch: { to: new mongoose.Types.ObjectId(user._id) },
      };
    }

    if (user.role == 'PRO') {
      if (employeeId)
        query['assigned_employees'] = {
          // @ts-ignore
          $elemMatch: { to: new mongoose.Types.ObjectId(employeeId) },
        };
      else {
        query['to'] = user._id;
      }
    }
    let result = await this.appointmentModel
      .find(query)
      .populate('from')
      .populate({
        path: 'assigned_employees.to',
        populate: { path: 'relatedCompany' },
      })
      .populate({ path: 'prestations' })
      .lean()
      .sort({ start_date: 1 });
    //.distinct('appointmentInstance', { appointmentInstance :{$ne:null}});
    const new_result = result;
    //  result.filter((value, index, self) => {
    //   return (
    //     index ==
    //       self.findIndex(
    //         (t) =>
    //           String(t['appointmentInstance']) ==
    //           String(value['appointmentInstance']),
    //       ) || value['appointmentInstance'] == null
    //   );
    // });
    console.log(new_result.length);
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_FETCHED',
      data: new_result,
    };
  }

  async joinAppointmentOnline(appointmentInstanceId) {
    /* check if twilio is generated by the appointment pro */
    const appointmentInstance_data =
      await this.appointmentInstanceModel.findOne({
        _id: appointmentInstanceId,
        twilio_data: { $ne: null },
      });
    if (!appointmentInstance_data)
      throw new HttpException(
        'API.APPOINTMENT_NOT_STARTED',
        HttpStatus.FORBIDDEN,
      );
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_STARTED',
    };
  }
  async fetchTurnover(fetchAppointmentByDateDto: FetchAppointmentByDateDto) {
    // chiffre d'affaire
    try {
      // let total = 0;
      // const turnover = await this.appointmentModel.find({
      //   to: fetchAppointmentByDateDto.id,
      //   finished: true
      // }).populate("appointmentInstance");
      // for (let i = 0; i < turnover.length; i++) {
      //   if (turnover[i]["appointmentInstance"] == null) {
      //     if (turnover[i]["total_amount"]) {
      //       total += turnover[i]["total_amount"]
      //     }
      //   } else {
      //     total += turnover[i]["appointmentInstance"].attending_members * turnover[i]["total_amount"];
      //   }
      // }
      // return {
      //   statusCode: 200,
      //   message: 'API.TURNOVER.BY.PRO',
      //   data: turnover,
      //   total: total,
      // };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }
  // async getClientByAssignedEmployee(
  //   emp_id: string,
  //   search: string,
  //   page_number: number,
  //   page_size: number,
  // ) {
  //   console.log(emp_id);
  //   (search == undefined || search == null) ?? (search = '');
  //   const clientLen = await this.appointmentModel.aggregate([
  //     {
  //       $lookup: {
  //         from: 'users',
  //         localField: 'from',
  //         foreignField: '_id',
  //         as: 'from',
  //       },
  //     },
  //     { $unwind: '$from' },
  //     {
  //       //ererere df
  //       $match: {
  //         $and: [
  //           {
  //             assigned_employees: {
  //               //@ts-ignore
  //               $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
  //             },
  //           },
  //           { status: 'Pending' },
  //           {
  //             $or: [
  //               {
  //                 'from.firstName': {
  //                   $regex: new RegExp(`${search}`),
  //                   $options: 'i',
  //                 },
  //               },
  //               {
  //                 'from.lastName': {
  //                   $regex: new RegExp(`${search}`),
  //                   $options: 'i',
  //                 },
  //               },
  //               {
  //                 'from.email': {
  //                   $regex: new RegExp(`${search}`),
  //                   $options: 'i',
  //                 },
  //               },
  //             ],
  //           },
  //           { 'from.type': privilege.CLIENT },
  //         ],
  //       },
  //     },
  //   ]);

  //   let clientOnlylen = [];
  //   clientLen.map((data) => {
  //     if (clientOnlylen.length > 0) {
  //       if (
  //         clientOnlylen.some((payload) => {
  //           console.log(String(payload._id), '----', String(data.from._id));
  //           console.log(String(payload._id) != String(data.from._id));

  //           return String(payload._id) != String(data.from._id);
  //         })
  //       ) {
  //         clientOnlylen.push(data.from);
  //       }
  //     } else {
  //       clientOnlylen.push(data.from);
  //     }
  //   });

  //   const appointlength = (
  //     await this.appointmentModel.aggregate([
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'from',
  //           foreignField: '_id',
  //           as: 'from',
  //         },
  //       },
  //       { $unwind: '$from' },
  //       {
  //         //ererere df
  //         $match: {
  //           $and: [
  //             {
  //               assigned_employees: {
  //                 //@ts-ignore
  //                 $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
  //               },
  //             },
  //             { level: 1 },
  //             { status: 'Pending' },
  //             {
  //               $or: [
  //                 {
  //                   'from.firstName': {
  //                     $regex: new RegExp(`${search}`),
  //                     $options: 'i',
  //                   },
  //                 },
  //                 {
  //                   'from.lastName': {
  //                     $regex: new RegExp(`${search}`),
  //                     $options: 'i',
  //                   },
  //                 },
  //                 {
  //                   'from.email': {
  //                     $regex: new RegExp(`${search}`),
  //                     $options: 'i',
  //                   },
  //                 },
  //               ],
  //             },
  //             { 'from.type': privilege.CLIENT },
  //           ],
  //         },
  //       },
  //     ])
  //   ).length;
  //   const appoints = await this.appointmentModel.aggregate([
  //     {
  //       $lookup: {
  //         from: 'users',
  //         localField: 'from',
  //         foreignField: '_id',
  //         as: 'from',
  //       },
  //     },
  //     { $unwind: '$from' },
  //     {
  //       $match: {
  //         $and: [
  //           { level: 1 },
  //           {
  //             assigned_employees: {
  //               //@ts-ignore
  //               $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
  //             },
  //           },
  //           { status: 'Pending' },
  //           { 'from.type': privilege.CLIENT },
  //           {
  //             $or: [
  //               {
  //                 'from.firstName': {
  //                   $regex: new RegExp(`${search}`),
  //                   $options: 'i',
  //                 },
  //               },
  //               {
  //                 'from.lastName': {
  //                   $regex: new RegExp(`${search}`),
  //                   $options: 'i',
  //                 },
  //               },
  //               {
  //                 'from.email': {
  //                   $regex: new RegExp(`${search}`),
  //                   $options: 'i',
  //                 },
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'companies',
  //         localField: 'company',
  //         foreignField: '_id',
  //         as: 'company',
  //       },
  //     },
  //     { $unwind: '$company' },
  //     {
  //       $lookup: {
  //         from: 'users',
  //         localField: 'to',
  //         foreignField: '_id',
  //         as: 'to',
  //       },
  //     },
  //     { $unwind: '$from' },
  //     {
  //       $lookup: {
  //         from: 'prestations',
  //         localField: 'prestations',
  //         foreignField: '_id',
  //         as: 'prestations',
  //       },
  //     },

  //     { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
  //     { $limit: page_number && page_size ? +page_size : 10 },
  //   ]);

  //   let clientOnly = [];
  //   appoints.map((data) => {
  //     if (clientOnly.length > 0) {
  //       if (
  //         clientOnly.some((payload) => {
  //           console.log(String(payload._id), '----', String(data.from._id));
  //           console.log(String(payload._id) != String(data.from._id));

  //           return String(payload._id) != String(data.from._id);
  //         })
  //       ) {
  //         clientOnly.push(data.from);
  //       }
  //     } else {
  //       clientOnly.push(data.from);
  //     }
  //   });

  //   //   if (clientOnly.some((payload) => payload.from._id !== data.from._id)) {
  //   //     clientOnly.push(data.from);
  //   //   }
  //   // });
  //   return {
  //     clientOnly,
  //     clientlength: clientOnlylen.length,
  //     appointlength,
  //     appointment: appoints,
  //   };
  //   //637905d67f143364df406e30
  // }

async getClientByAssignedEmployee(
    emp_id: string,
    search: string,
    page_number: number,
    page_size: number,
  ) {
    console.log(emp_id);
    (search == undefined || search == null) ?? (search = '');

    const clients = await this.appointmentModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        //ererere df
        $match: {
          $and: [
            { 'from.type': privilege.CLIENT },
            {
              assigned_employees: {
                //@ts-ignore
                $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
              },
            },
            { finished: true },
            { level: 1 },
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
                  'from.email': {
                    $regex: new RegExp(`${search}`),
                    $options: 'i',
                  },
                },
              ],
            },
            
          ],
        },
      },
         { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
    { $limit: page_number && page_size ? +page_size : 10 },
    ]);

 




    //!search client
    const clientLen = await this.appointmentModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        //ererere df
        $match: {
          $and: [
            { 'from.type': privilege.CLIENT },
            {
              assigned_employees: {
                //@ts-ignore
                $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
              },
            },
            { finished: true },
            { level: 1 },
            {
              $or: [
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
                  'from.email': {
                    $regex: new RegExp(`${search}`),
                    $options: 'i',
                  },
                },
              ],
            },
            
          ],
        },
      },
      
    ]);
        //! client lengh
    let clientOnlylen = [];
    clientLen.map((data) => {
      if (clientOnlylen.length > 0) {
        if (
          clientOnlylen?.some((payload) => {
            console.log(String(payload._id), '----', String(data.from._id));
            console.log(String(payload._id) != String(data.from._id));

            return String(payload._id) != String(data.from._id);
          })
        ) {
          clientOnlylen.push(data.from);
        }
     } else {
       clientOnlylen.push(data.from);
     }
    });



    let clientOnly = [];
    clients.map((data) => {
      if (clientOnly.length > 0) {
        if (
          clientOnly.some((payload) => {
            console.log(String(payload._id), '----', String(data.from._id));
            console.log(String(payload._id) != String(data.from._id));

            return String(payload._id) != String(data.from._id);
          })
        ) {
          clientOnly.push(data.from);
        }
      } else {
        clientOnly.push(data.from);
      }
    });

    const appointlength = (
      await this.appointmentModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: '$from' },
        {
          //ererere df
          $match: {
            $and: [
              // { 'from.type': privilege.CLIENT },
              {
                assigned_employees: {
                  //@ts-ignore
                  $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
                },
              },
              { status: 'Pending' },
              { active: true },
              { level: 1 },
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
                    'from.email': {
                      $regex: new RegExp(`${search}`),
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

    const appoints = await this.appointmentModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        //ererere df
        $match: {
          $and: [
            // { 'from.type': privilege.CLIENT },
            {
              assigned_employees: {
                //@ts-ignore
                $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
              },
            },
            { status: 'Pending' },
            { active: true },
            { level: 1 },
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
                  'from.email': {
                    $regex: new RegExp(`${search}`),
                    $options: 'i',
                  },
                },
              ],
            },
            
          ],
        },
      },
      // {
      //   $match: {
      //     $and: [
      //       { level: 1 },
      //       {
      //         assigned_employees: {
      //           //@ts-ignore
      //           $elemMatch: { to: new mongoose.Types.ObjectId(emp_id) },
      //         },
      //       },
      //      { status: 'Pending' },
      //       {
      //         $or: [
      //           {
      //             'from.firstName': {
      //               $regex: new RegExp(`${search}`),
      //               $options: 'i',
      //             },
      //           },
      //           {
      //             'from.lastName': {
      //               $regex: new RegExp(`${search}`),
      //               $options: 'i',
      //             },
      //           },
      //           {
      //             'from.email': {
      //               $regex: new RegExp(`${search}`),
      //               $options: 'i',
      //             },
      //           },
      //         ],
      //       },
      //     ],
      //   },
      // },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'to',
        },
      },
      { $unwind: '$from' },
      {
        $lookup: {
          from: 'prestations',
          localField: 'prestations',
          foreignField: '_id',
          as: 'prestations',
        },
      },
      { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);

    //   if (clientOnly.some((payload) => payload.from._id !== data.from._id)) {
    //     clientOnly.push(data.from);
    //   }
    // });

    console.log(clientOnlylen.length, clientOnly.length, appointlength);
    // console.log(appoints);

    return {
      clientOnly,
      clientlength: clientOnlylen.length,
      appointment: appoints,
      appointlength,
    };
    //637905d67f143364df406e30
  }

  async fetchAppointmentsWithQuery(query) {
    return this.appointmentModel.find(query);
  }

  async fetchAppointmentBackoffice() {
    return await this.appointmentModel.find({
      finished: true,
    });
  }

  async getMynextAppointment(userId: string) {
    console.log();
    //let date = '2022-12-13T10:51:13.376Z';
    const appointments = await this.appointmentModel
      .find({
        status: 'Accepted',
        start_date: { $gt: new Date(Date.now()) },
        $or: [
          { to: userId },
          {
            $and: [
              { 'assigned_employees.to': userId },
              { accept_status: 'Accepted' },
            ],
          },
          { from: userId },
          // {
          //   assigned_employees: {
          //     $in: { to: userId, accept_status: 'Accepted' },
          //   },
          // },
        ],
      })
      .populate('from')
      .populate('company')
      .limit(10)
      .sort({ start_date: 1 });
    console.log(appointments.map((data) => data.start_date));

    return appointments;
  }
  // async resetServiceForAdmin(user: UserToken, type: string) {
  //   switch (type) {
  //     case appointStatus.POSTPOINED_APPOINTEMENT: {
  //       await this.AppointmentStatModel.findOneAndUpdate(
  //         {
  //           userId: user._id,

  //           type: appointStatus.POSTPOINED_APPOINTEMENT,
  //         },
  //         {
  //           userId: user._id,

  //           tryNumber: 0,
  //           type: appointStatus.POSTPOINED_APPOINTEMENT,
  //         },
  //         { upsert: true },
  //       );
  //       return apiReturner(HttpStatus.OK, SUCCEEDED);
  //     }
  //     case appointStatus.CANCLED_APPOINTEMENT: {
  //       await this.AppointmentStatModel.findOneAndUpdate(
  //         {
  //           userId: user._id,

  //           type: appointStatus.CANCLED_APPOINTEMENT,
  //         },
  //         {
  //           userId: user._id,

  //           tryNumber: 0,
  //           type: appointStatus.CANCLED_APPOINTEMENT,
  //         },
  //         { upsert: true },
  //       );
  //       return apiReturner(HttpStatus.OK, SUCCEEDED);
  //     }
  //   }
  // }

  async getMondayAppointmentService(user: UserToken) {
    const lisOfMyApp = await this.appointmentModel
      .find({
        to: user._id,
        status: 'Accepted',
        start_date: { $gt: new Date() },
      })
      .populate(['from', 'company'])
      .sort({ start_date: -1 });
    const mondayList = [];
    lisOfMyApp.map((app) => {
      if (new Date(app.start_date).getDay() == 1) {
        mondayList.push(app);
      }
    });

    return apiReturner(
      HttpStatus.OK,
      SUCCEEDED,
      mondayList.length == 0 ? null : mondayList,
    );
  }

  async appointmentToCancel(user) {
    const appointments = await this.appointmentModel.find({
      to: user._id,
      finished: false,
      $or: [
        { status: 'Accepted' },
        { status: 'Pending' },
        { status: 'PostPoned' },
      ],
    });
    return appointments;
  }
}
