import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Events, TheNext } from './schemas/event.entity';
import { UsersService } from '../users/users.service';
import { apiReturner } from 'src/shared/returnerApi';
import { dynamicLink } from 'src/shared/generateDynamicLink';
import {
  APPOINTEMNT_DEMANDE_FOR_PRO,
  CANCELED_EVENT,
  NEW_PRIVAT_EVENT_INVITATION,
  SUCCEEDED,
} from 'src/constantes/constantes';
import { EventsMembers } from './schemas/eventMembers.entity';
import { PaymentService } from '../payment/payment.service';
import { FilesS3Service } from '../auth/s3.service';
import { Pricing } from 'aws-sdk';
import { notifTag, privilege } from 'src/shared/enums';
import { from } from 'rxjs';
import { Cron } from '@nestjs/schedule/dist/decorators/cron.decorator';
import { createTwilioRoom } from 'src/shared/createTwilioRoom';
import { fetchTwilioRoomStatus } from 'src/shared/fetchTwilioRoomStatus';
import { WalletService } from '../wallet/wallet.service';
import { UserToken } from 'src/shared/tokenModel';
import {
  dataPayload,
  NotificationMessage,
  onNotify,
} from 'src/shared/notif.class';
import { NotificationService } from '../notifications/notification.service';
import { User } from '../users/models/user.model';
import * as moment from 'moment';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule/dist';
import { CronTime } from 'cron';
import * as momenttz from 'moment-timezone';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(TheNext.name)
    private thnextModel: Model<TheNext>,
    @InjectModel(Events.name)
    private eventsModel: Model<Events>,
    @InjectModel(EventsMembers.name)
    private eventsMembersModel: Model<EventsMembers>,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly paymentService: PaymentService,
    private readonly filesService: FilesS3Service,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'Hours' })
  // async handleCronD() {
  //   const job = this.schedulerRegistry.getCronJob('Hours');
  //   console.log(job.lastDate());
  //   if ((await this.thnextModel.countDocuments()) != 0) {
  //     await this.thnextModel.updateMany({ soonInD: { $gte: 2 } }, [
  //       {
  //         $set: {
  //           soonInD: {
  //             $divide: [
  //               {
  //                 $round: {
  //                   $toDouble: {
  //                     $divide: [
  //                       { $subtract: ['$comparativeDate', new Date()] },
  //                       1000 * 60 * 60,
  //                     ],
  //                   },
  //                 },
  //               },
  //               24, // Divide by the number of hours in a day (24) to get days
  //             ],
  //           },
  //         },
  //       },
  //     ]);
  //     const readyToSend14 = await this.thnextModel.aggregate([
  //       { $match: { soonInD: 14 } },
  //     ]);
  //     const readyToSend2 = await this.thnextModel.aggregate([
  //       { $match: { soonInD: 2 } },
  //     ]);

  //     console.log(readyToSend14);
  //     console.log(readyToSend2);
  //     console.log('send notification D');
  //     //todo  send notification then delete the next
  //   }
  // }

  // @Cron(CronExpression.EVERY_HOUR, { name: 'Hours' })
  // async handleCronH() {
  //   const job = this.schedulerRegistry.getCronJob('Hours');
  //   console.log(job.lastDate());
  //   if ((await this.thnextModel.countDocuments()) != 0) {
  //     await this.thnextModel.updateMany({ soonInH: { $gte: 1 } }, [
  //       {
  //         $set: {
  //           soonInH: {
  //                 $round: {
  //                   $toDouble: {
  //                     $divide: [
  //                       { $subtract: ['$comparativeDate', new Date()] },
  //                       1000 * 60 * 60,
  //                     ],
  //                   },
  //                 },
  //               },
  //         },
  //       },
  //     ]);

  //     const readyToSend = await this.thnextModel.aggregate([
  //       { $match: { soonInH: 26 } }
  //     ]);

  //     console.log(readyToSend);
  //     console.log('send notification H');
  //     //todo  send notification then delete the next
  //   }
  // }
  // @Cron(CronExpression.EVERY_MINUTE, { name: 'Minutes' })
  // async handleCronM() {
  //   if ((await this.thnextModel.countDocuments()) != 0) {
  //     await this.thnextModel.updateMany({ $and: [{soonInM:{ $gte: 15 }},{$and:[{soonInH:{$lte:2}},{soonInH:{$gt:0}}]}]}, [
  //       {
  //         $set: {
  //           soonInM: {
  //             $sum: [
  //               0,
  //               {
  //                 $round: {
  //                   $toDouble: {
  //                     $divide: [
  //                       { $subtract: ['$comparativeDate', new Date()] },
  //                       1000 * 60,
  //                     ],
  //                   },
  //                 },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     ]);

  //     // const readyToSend = await this.thnextModel.aggregate([{ $match: { soonIn: 26 } }])
  //     const readyToSend15 = await this.thnextModel.aggregate([
  //       { $match: { soonInM: 15 } },
  //     ]);

  //     console.log(readyToSend15);
  //     console.log('send notification M');
  //   }
  // }

  async create(createEventDto: CreateEventDto, user, image) {
    /* check if the user has enough events */
    let user_data = await this.userService.findUserBy({ _id: user._id });
    user_data['available_events'] = user_data['available_events']
      ? user_data['available_events']
      : 0;
    if (user_data['available_events'] == 0)
      throw new HttpException(
        apiReturner(HttpStatus.FORBIDDEN, 'API_NOT_ENOUGH_EVENTS'),
        HttpStatus.FORBIDDEN,
      );
    await this.filesService.uploadFile(
      image.buffer,
      image.originalname + '.jpeg',
    );
    createEventDto['owner'] = user._id;
    createEventDto['image_name'] = image.originalname + '.jpeg';
    const created_event = await this.eventsModel.create(createEventDto);

    //
    //
    // console.log('now s ',moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
    // console.log(
    //   'now of  c  ==> ',
    //   momenttz().tz('Europe/Paris'),
    // );
    // console.log(
    //   'now of  s  ==> ',
    //   new Date(new Date().toLocaleString('fr-FR', {timeZone: 'Europe/Paris'})),
    // );
    // console.log('start event => : ', createEventDto.start_date);
    // console.log(new Date(createEventDto.start_date));
    // console.log(
    //   'diff :',
    //   momenttz().tz('Europe/Paris').diff(createEventDto.start_date, 'hours'),
    // );

    // const options = { timeZone: 'Europe/Paris', hour12: false };
    // const date = new Date();
    // const utcDate = new Date();
    // const formattedDate = new Date(utcDate).toLocaleString('en-US', options);
    // console.log(formattedDate);
    // const dateObj = new Date(formattedDate);

    console.log(createEventDto.start_date);
    console.log('server time : ', moment());
    console.log(Math.abs(moment().diff(createEventDto.start_date, 'minutes')));
    console.log(Math.abs(moment().diff(createEventDto.start_date, 'hours')));

    await this.thnextModel.findOneAndUpdate(
      {
        toNotif: user._id,
        event: created_event._id,
        type: 'event',
      },
      {
        toNotif: user._id,
        event: created_event._id,
        comparativeDate: createEventDto.start_date,
        soonInD: Math.abs(moment().diff(createEventDto.start_date, 'days')),
        soonInH: Math.abs(moment().diff(createEventDto.start_date, 'hours')),
        soonInM: Math.abs(moment().diff(createEventDto.start_date, 'minutes')),
        type: 'event',
      },
      { upsert: true, new: true },
    );

    await this.userService.UpdateUserById(user._id, {
      available_events: user_data['available_events'] - 1,
    });
    let invited_members_promise = [];
    if (createEventDto.invited_users) {
      for (let i = 0; i < createEventDto?.invited_users?.length; i++) {
        invited_members_promise.push(
          this.eventsMembersModel.findOneAndUpdate(
            {
              userId: createEventDto.invited_users[i],
              eventId: created_event._id,
              status: 'Invited',
            },
            {},
            { upsert: true },
          ),
        );

        console.log('event inv private ');
        const targetNotif = await this.userService.getUserById(
          createEventDto.invited_users[i],
        );
        console.log('from : ', user_data.firstName);

        console.log(
          '****************************************************************************to: ',
          targetNotif.data,
        );

        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.NEW_PRIVAT_EVENT_INVITATION,
            firstName: user_data.firstName,
            lastName: user_data.lastName,
            companyName: user_data.companyName,
            eventName: created_event.event_name,
            eventId: created_event._id.toString(),
            start_date: created_event.start_date.toISOString(),
            badge: await this.notificationService.badge(targetNotif.data._id),
            isViseo: created_event.on_line.toString(),
          }),
          notification: NEW_PRIVAT_EVENT_INVITATION(
            await this.notificationService.badge(targetNotif.data._id),
          ),
        };

        await onNotify(
          user_data,
          targetNotif.data,
          this.notificationService,
          message,
        );
      }
    }
    await Promise.all(invited_members_promise);
    console.log(createEventDto.all, typeof createEventDto.all);
    if (createEventDto.all == true || createEventDto.all.toString() == 'true') {
      /*to change later with users client */
      //!!!!!!!!!!!!!!!!!!!!!!
      const users = await this.userService.findAll({}, 500, 1);
      for (let i = 0; i < users.length; i++) {
        await this.eventsMembersModel.findOneAndUpdate(
          {
            userId: users[i]._id,
            eventId: created_event._id,
            status: 'Invited',
          },
          {},
          { upsert: true },
        );

        const targetNotif = await this.userService.getUserById(users[i]._id);
        console.log('event inv private all ');

        let message: NotificationMessage = {
          data: dataPayload({
            tag: notifTag.NEW_PRIVAT_EVENT_INVITATION,
            firstName: user_data.firstName,
            lastName: user_data.lastName,
            companyName: user_data.companyName,
            badge: await this.notificationService.badge(targetNotif.data._id),
            start_date: created_event.start_date.toISOString(),
            eventName: created_event.event_name,
            eventId: created_event._id.toString(),
            isViseo: created_event.on_line.toString(),
          }),
          notification: NEW_PRIVAT_EVENT_INVITATION(
            await this.notificationService.badge(targetNotif.data._id),
          ),
        };

        await onNotify(
          user_data,
          targetNotif.data,
          this.notificationService,
          message,
        );
      }
    }

    return {
      statusCode: 201,
      message: 'API.EVENTS_CREATED',
      data: created_event,
    };
  }

  async findMyClients(page_size, page_number, search, eventId, user) {
    if (!search) search = '';
    // TODO: integrate pro - client relationship
    let client = await this.userService.searchUsersWithAggregate([
      //@ts-ignore
      {
        $match: {
          type: 'CLIENTSHIP',
          proId: new mongoose.Types.ObjectId(user._id),
        },
      },
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
          '_idclientInMyNetwork.type': 'CLIENT',
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: [
                      '_idclientInMyNetwork.firstName',
                      ' ',
                      '_idclientInMyNetwork.lastName',
                    ],
                  },
                  regex: new RegExp(`${search}`),
                  options: 'i',
                },
              },
            },
            {
              '_idclientInMyNetwork.firstName': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              '_idclientInMyNetwork.lastName': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              '_idclientInMyNetwork.phoneNumber': {
                $regex: search,
                $options: 'i',
              },
            },
          ],
        },
      },
      { $project: { _id: 0, _idclientInMyNetwork: 1 } },
      { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);

    client = client.map((client) => client['_idclientInMyNetwork']);
    client = client.filter((value, index, self) => {
      return (
        index == self.findIndex((t) => String(t['_id']) == String(value['_id']))
      );
    });
    const total_attributs = await this.userService.searchUsersWithAggregate([
      //@ts-ignore
      {
        $match: {
          type: 'CLIENTSHIP',
          proId: new mongoose.Types.ObjectId(user._id),
        },
      },
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
          '_idclientInMyNetwork.type': 'CLIENT',
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: [
                      '_idclientInMyNetwork.firstName',
                      ' ',
                      '_idclientInMyNetwork.lastName',
                    ],
                  },
                  regex: new RegExp(`${search}`),
                  options: 'i',
                },
              },
            },
            {
              '_idclientInMyNetwork.firstName': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              '_idclientInMyNetwork.lastName': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              '_idclientInMyNetwork.phoneNumber': {
                $regex: search,
                $options: 'i',
              },
            },
          ],
        },
      },
      { $project: { _id: 0, _idclientInMyNetwork: 1 } },
    ]);
    let invited_members = [];
    if (eventId) {
      invited_members = await this.eventsMembersModel.find(
        { eventId },
        'userId -_id',
      );
    }
    for (let i = 0; i < client.length; i++) {
      client[i]['is_invited'] =
        invited_members.findIndex(
          (member_id) => String(member_id['userId']) == String(client[i]._id),
        ) == -1
          ? false
          : true;
    }
    return {
      statusCode: 200,
      message: 'API.USERS_FETCHED',
      data: client,
      page_number,
      page_size,
      total_attributs: total_attributs.length,
    };
  }

  async findAll(page_size, page_number, search, categoryId, available, user) {
    const current_date = new Date(new Date().toISOString());
    let query = { status: 'Active' };
    if (!search) search = '';
    query['event_name'] = { $regex: search, $options: 'i' };
    /* fetch the events that i am in */
    let events_members = await this.eventsMembersModel.find({
      userId: user._id,
      status: 'Accepted',
    });
    const mapped_events_members = events_members.map((event) => event.eventId);
    if (categoryId) query['activity'] = new mongoose.Types.ObjectId(categoryId);
    if (available == 'false') {
      query['_id'] = { $in: mapped_events_members };
      query['ended'] = false;
    } else {
      query['ended'] = false;
      query['type'] = 'Public';
      query['_id'] = { $nin: mapped_events_members };
    }
    query['end_date'] = { $gte: current_date };
    // let fetched_events = await this.eventsModel
    //   .find(query)
    //   .populate('owner')
    //   .populate({ path: 'owner', populate: { path: 'relatedCompany' } })
    //   .populate('activity')
    //   .sort({ start_date: 1 })
    //   .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
    //   .limit(page_number && page_size ? +page_size : 10)
    //   .lean();
    let fetched_events = await this.eventsModel.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $unwind: { path: '$owner' } },

      {
        $lookup: {
          from: 'companies',
          localField: 'owner.relatedCompany',
          foreignField: '_id',
          as: 'owner.relatedCompany',
        },
      },
      { $unwind: { path: '$owner.relatedCompany' } },
      { $match: { 'owner.active': true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'activity',
          foreignField: '_id',
          as: 'activity',
        },
      },
      { $unwind: { path: '$activity' } },
      { $sort: { start_date: 1 } },
      { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);

    const total = await this.eventsModel.count(query);
    for (let i = 0; i < fetched_events.length; i++) {
      const fetch_current_user = await this.eventsMembersModel.findOne({
        userId: user._id,
        eventId: fetched_events[i]._id,
        status: 'Accepted',
      });
      const [
        face_to_face_members,
        face_to_face_count,
        online_members,
        online_count,
        invited_members,
      ] = await this.fetchEventsMembers(fetched_events[i]._id);
      fetched_events[i]['face_to_face_members'] = face_to_face_members;
      fetched_events[i]['face_to_face_count'] = face_to_face_count;
      fetched_events[i]['online_members'] = online_members;
      fetched_events[i]['online_count'] = online_count;
      fetched_events[i]['invited_members'] = invited_members;
      fetched_events[i]['joined_online'] = fetch_current_user?.online
        ? true
        : false;
      fetched_events[i]['joined_offline'] =
        fetch_current_user?.online == false ? true : false;
    }
    return {
      statusCode: 200,
      message: 'API.EVENTS_FETCHED',
      data: fetched_events,
      page_number,
      page_size,
      total_attributs: total,
    };
  }

  async fetchEventsMembers(eventId) {
    let promise_array = [];
    promise_array.push(
      this.eventsMembersModel
        .find({ eventId, online: false, status: 'Accepted' }, 'userId -_id')
        .populate('userId')
        .limit(3),
    );
    promise_array.push(
      this.eventsMembersModel.count({
        eventId,
        online: false,
        status: 'Accepted',
      }),
    );
    promise_array.push(
      this.eventsMembersModel
        .find({ eventId, online: true, status: 'Accepted' }, 'userId -_id')
        .populate('userId')
        .limit(3),
    );
    promise_array.push(
      this.eventsMembersModel.count({
        eventId,
        online: true,
        status: 'Accepted',
      }),
    );
    promise_array.push(
      this.eventsMembersModel.count({ eventId, status: 'Invited' }),
    );
    return await Promise.all(promise_array);
  }

  async createEventMember(condition, update) {
    return await this.eventsMembersModel.findOneAndUpdate(
      { condition },
      { update },
      { upsert: true, new: true },
    );
  }

  async findEventById(eventId, user) {
    let event = await this.eventsModel
      .findOne({ _id: eventId })
      .populate('activity')
      .populate({ path: 'owner', populate: { path: 'relatedCompany' } })
      .lean();
    /* check if the current user payed for the event */
    const fetch_user_status = await this.eventsMembersModel.findOne({
      eventId,
      userId: user._id,
    });
    if (
      event.type == 'Private' &&
      !fetch_user_status &&
      event['owner']['_id'] != user._id
    )
      throw new HttpException(
        apiReturner(HttpStatus.FORBIDDEN, 'API_EVENT_NOT_EXISTANT'),
        HttpStatus.FORBIDDEN,
      );
    const [
      face_to_face_members,
      face_to_face_count,
      online_members,
      online_count,
      invited_members,
    ] = await this.fetchEventsMembers(event._id);
    event['face_to_face_members'] = face_to_face_members;
    event['face_to_face_count'] = face_to_face_count;
    event['online_members'] = online_members;
    event['online_count'] = online_count;
    event['invited_members'] = invited_members;
    event['payed'] = fetch_user_status?.status == 'Accepted' ? true : false;
    event['joined_online'] = fetch_user_status?.online ? true : false;
    event['joined_offline'] = fetch_user_status?.online == false ? true : false;
    return {
      statusCode: 200,
      message: 'API.EVENTS_FETCHED',
      data: event,
    };
  }

  async fetchEventParticipants(
    page_size,
    page_number,
    search,
    user,
    online,
    eventId,
  ) {
    if (!search) search = '';
    const participants = await this.eventsMembersModel.aggregate([
      {
        // @ts-ignore
        $match: {
          online: JSON.parse(online),
          // @ts-ignore
          eventId: new mongoose.Types.ObjectId(eventId),
          status: 'Accepted',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      { $unwind: { path: '$userId' } },
      {
        $match: {
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: ['$userId.firstName', ' ', '$userId.lastName'],
                  },
                  regex: new RegExp(`${search}`),
                  options: 'i',
                },
              },
            },
            { 'userId.firstName': { $regex: search, $options: 'i' } },
            { 'userId.lastName': { $regex: search, $options: 'i' } },
            { 'userId.phoneNumber': { $regex: search, $options: 'i' } },
          ],
        },
      },
      { $skip: page_number && page_size ? (+page_number - 1) * +page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    ]);

    const total = await this.eventsMembersModel.aggregate([
      {
        // @ts-ignore
        $match: {
          online: JSON.parse(online),
          // @ts-ignore
          eventId: new mongoose.Types.ObjectId(eventId),
          status: 'Accepted',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      { $unwind: { path: '$userId' } },
      {
        $match: {
          $or: [
            { 'userId.firstName': { $regex: search, $options: 'i' } },
            { 'userId.lastName': { $regex: search, $options: 'i' } },
            { 'userId.phoneNumber': { $regex: search, $options: 'i' } },
          ],
        },
      },
    ]);
    return {
      statusCode: 200,
      message: 'API.PARTICIPANTS_FETCHED',
      data: participants,
      page_number,
      page_size,
      total_attributs: total.length,
    };
  }

  async fetchProEvents(page_size, page_number, passed, user) {
    let query = { owner: user._id, status: 'Active' };
    const curret_date = new Date(new Date().toISOString());
    if (passed == 'true') {
      query['$or'] = [{ end_date: { $lt: curret_date } }, { ended: true }];
    } else {
      (query['end_date'] = { $gte: curret_date }), (query['ended'] = false);
    }

    let events = await this.eventsModel
      .find(query)
      .populate('activity')
      .populate('owner')
      .sort({ start_date: 1 })
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10)
      .lean();

    for (let i = 0; i < events.length; i++) {
      const [
        face_to_face_members,
        face_to_face_count,
        online_members,
        online_count,
        invited_members,
      ] = await this.fetchEventsMembers(events[i]._id);
      events[i]['face_to_face_members'] = face_to_face_members;
      events[i]['face_to_face_count'] = face_to_face_count;
      events[i]['online_members'] = online_members;
      events[i]['online_count'] = online_count;
      events[i]['invited_members'] = invited_members;
    }

    return {
      statusCode: 200,
      message: 'API.PARTICIPANTS_FETCHED',
      data: events,
      page_number,
      page_size,
      total_current: await this.eventsModel.count({
        owner: user._id,
        status: 'Active',
        end_date: { $gte: curret_date },
        ended: false,
      }),
      total_passed: await this.eventsModel.count({
        owner: user._id,
        status: 'Active',
        $or: [{ end_date: { $lt: curret_date } }, { ended: true }],
      }),
      available_events: (await this.userService.findUserBy({ _id: user._id }))[
        'available_events'
      ],
    };
  }

  async cancelEvent(eventId, user: UserToken) {
    /* fetch the participants list */
    console.log('heeeeeeeeeeeer');
    const payloadfrom = await this.userService.getUserById(user._id);
    const event = await this.eventsModel.findOne({ _id: eventId });

    const participants = await this.eventsMembersModel
      .find({ eventId, status: 'Accepted', paymentId: { $ne: null } })
      .populate(['paymentId']);

    let array_promise = [];
    console.log('after for', participants.length);
    for (let i = 0; i < participants.length; i++) {
      console.log(i);

      const payloadto = await this.userService.getUserById(
        participants[i].userId,
      );
      let message: NotificationMessage = {
        data: dataPayload({
          tag: notifTag.CANCELED_EVENT,
          firstName: payloadfrom.data.firstName,
          lastName: payloadfrom.data.lastName,
          companyName: payloadfrom.data.companyName,
          badge: await this.notificationService.badge(payloadto.data._id),
          eventName: event.event_name,
        }),
        notification: CANCELED_EVENT(
          await this.notificationService.badge(payloadto.data._id),
        ),
      };
      console.log('heeeeeeeeeeeer2');

      await onNotify(
        payloadfrom.data,
        payloadto.data,
        this.notificationService,
        message,
      );
      console.log('heeeeeeeeeeeer3');

      array_promise.push(
        this.eventsMembersModel.findOneAndUpdate(
          { _id: participants[i]._id },
          { status: 'Refunded' },
        ),
      );
      array_promise.push(
        this.paymentService.createRefund(
          participants[i]['paymentId']['stripe_data']['data']['object']['id'],
          participants[i]['paymentId'],
          participants[i]['online'] == true ? event.price_on_line+100 : event.price_face_to_face+100,
          true,
          false
        ),
      );
    }
    array_promise.push(
      this.eventsModel.findOneAndUpdate(
        { _id: eventId },
        { status: 'Canceled' },
      ),
    );

    array_promise.push(
      this.notificationService.deleteNotifcationQuery({
        'data.tag': 'NEW_SIGNUP_EVT',
        'data.eventId': eventId,
      }),
    );
    await Promise.all(array_promise);
    return { statusCode: 200, message: 'API.EVENT_CANCELED' };
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  async fetchNextEvent(user) {
    let event = await this.eventsModel
      .findOne({
        owner: user._id,
        status: 'Active',
        end_date: { $gte: new Date().toISOString() },
        ended: false,
      })
      .populate('activity')
      .populate('owner')
      .sort({ start_date: 1 })
      .lean();
    if (!event) return null;
    const [
      face_to_face_members,
      face_to_face_count,
      online_members,
      online_count,
      invited_members,
    ] = await this.fetchEventsMembers(event._id);
    event['face_to_face_members'] = face_to_face_members;
    event['face_to_face_count'] = face_to_face_count;
    event['online_members'] = online_members;
    event['online_count'] = online_count;
    event['invited_members'] = invited_members;

    return event;
  }

  async update(id: string, updateEventDto, file) {
    if (file) {
      await this.filesService.uploadFile(
        file.buffer,
        file.originalname + '.jpeg',
      );
      updateEventDto['image_name'] = file.originalname + '.jpeg';
    }
    let invited_users;
    if (!updateEventDto.invited_users) invited_users = [];
    else invited_users = updateEventDto.invited_users;
    delete updateEventDto.invited_users;
    await this.eventsModel.findOneAndUpdate({ _id: id }, updateEventDto);
    let invited_members_promise = [];
    for (let i = 0; i < invited_users.length; i++) {
      invited_members_promise.push(
        this.eventsMembersModel.findOneAndUpdate(
          {
            userId: invited_users[i],
            eventId: id,
            status: 'Invited',
          },
          {},
          { upsert: true },
        ),
      );
    }
    await Promise.all(invited_members_promise);
    return { statusCode: 200, message: 'API.EVENT_UPDATED' };
  }

  async cancelEventParticipation(eventId, user) {
    let array_promise = [];
    const event = await this.eventsModel.findOne({ _id: eventId });
    const participant = await this.eventsMembersModel
      .findOne({
        userId: user._id,
        eventId,
      })
      .populate('paymentId');
    array_promise.push(
      this.eventsMembersModel.findOneAndUpdate(
        { _id: participant._id },
        { status: 'Refunded' },
      ),
    );
    array_promise.push(
      this.paymentService.createRefund(
        participant['paymentId']['stripe_data']['data']['object']['id'],
        participant['paymentId'],
        participant['online'] == true ? event.price_on_line : event.price_face_to_face,
        "",
        user.type == privilege.CLIENT?true:false
      ),
    );

    await Promise.all(array_promise);
    return { statusCode: 200, message: 'API.EVENT_UPDATED' };
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }
  async shareEventService(_id: string) {
    const mobileLink = await dynamicLink(_id, 'id', 'events_share');
    return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
      mobile_Link: mobileLink,
      web_link: process.env.F_URL + 'evenements/' + _id,
    });
  }

  // @Cron('0 0 0 * * *', { timeZone: 'Europe/Paris', name: 'event checker' })
  // async handleCron() {
  //   /* clients to add */
  //   const clients = await this.eventsMembersModel.aggregate([
  //     { $match: { status: 'Accepted' } },
  //     {
  //       $lookup: {
  //         from: 'events',
  //         localField: 'eventId',
  //         foreignField: '_id',
  //         as: 'eventId',
  //       },
  //     },
  //     { $unwind: { path: '$eventId' } },
  //     {
  //       $match: {
  //         'eventId.status': 'Active',
  //         'eventId.end_date': { $lt: new Date() },
  //       },
  //     },
  //   ]);
  //   console.log(clients);
  //   let promise_array = [];
  //   for (let i = 0; i < clients.length; i++) {
  //     promise_array.push(
  //       this.userService.createClientShip(
  //         clients[i].eventId.owner,
  //         clients[i].userId,
  //       ),
  //     );
  //   }
  //   Promise.all(promise_array);
  //   //const ended_events = await this.eventsModel.find({end_date:{$lte: new Date()}})
  // }

  async endEvent(startEventDto, user) {
    const Pusher = require('pusher');
    const pusher = new Pusher({
      appId: process.env.pusher_appId,
      key: process.env.pusher_key,
      secret: process.env.pusher_secret,
      cluster: process.env.pusher_cluster,
      useTLS: process.env.pusher_userTLS,
    });
    const clients = await this.eventsMembersModel
      .find({
        eventId: startEventDto.eventId,
        status: 'Accepted',
      })
      .populate('eventId');
    // const clients = await this.eventsMembersModel.aggregate([
    //   { $match: { status: 'Accepted' } },
    //   {
    //     $lookup: {
    //       from: 'events',
    //       localField: 'eventId',
    //       foreignField: '_id',
    //       as: 'eventId',
    //     },
    //   },
    //   { $unwind: { path: '$eventId' } },
    //   {
    //     $match: {
    //       'eventId.status': 'Active',
    //     },
    //   },
    // ]);
    let promise_array = [];
    let amount_to_be_payed = 0;
    if (clients.length != 0) {
      if (clients[0].eventId['number_of_participant_on_line'] != 0)
        await pusher.trigger(startEventDto.eventId, 'callended', {
          message: 'callended by pro',
        });
    }

    for (let i = 0; i < clients.length; i++) {
      if (String(clients[i]['online']) == 'true')
        amount_to_be_payed += Number(clients[i].eventId['price_on_line']);
      else
        amount_to_be_payed += Number(clients[i].eventId['price_face_to_face']);
      promise_array.push(
        this.userService.createClientShip(
          clients[i].eventId['owner'],
          clients[i].userId,
        ),
      );
    }
    const update_event = await this.eventsModel.findOneAndUpdate(
      { _id: startEventDto.eventId },
      { ended: true },
    );
    Promise.all(promise_array);
    if (update_event["ended"] == false){
  
    await this.walletService.updateWallet(user._id, {
      $inc: { amount: amount_to_be_payed },
    });
    await this.userService.UpdateUserById(user._id, {
      $inc: { ca: amount_to_be_payed / 100 },
    });
  }
    return { statusCode: 200, message: 'API.EVENT_ENDED' };
  }

  async fetchMyEvents(page_size, page_number, search, user) {
    if (!search) search = '';
    if (user.role == privilege.PRO) {
      console.warn('from pro');
      const myEvents = await this.eventsModel.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'activity',
            foreignField: '_id',
            as: 'activity',
          },
        },
        { $unwind: '$activity' },
        {
          $match: {
            $and: [
              {
                //@ts-ignore
                owner: new mongoose.Types.ObjectId(user._id),
              },
              {
                $or: [
                  {
                    event_name: {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    address: { $regex: new RegExp(`${search}`), $options: 'i' },
                  },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner',
          },
        },
        { $unwind: '$owner' },
        {
          $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
        },
        { $limit: page_number && page_size ? +page_size : 10 },
      ]);

      for (let i = 0; i < myEvents.length; i++) {
        const [
          face_to_face_members,
          face_to_face_count,
          online_members,
          online_count,
          invited_members,
        ] = await this.fetchEventsMembers(myEvents[i]._id);
        myEvents[i]['face_to_face_members'] = face_to_face_members;
        myEvents[i]['face_to_face_count'] = face_to_face_count;
        myEvents[i]['online_members'] = online_members;
        myEvents[i]['online_count'] = online_count;
        myEvents[i]['invited_members'] = invited_members;
      }

      const myEventsLength = (
        await this.eventsModel.aggregate([
          {
            $match: {
              $and: [
                {
                  //@ts-ignore
                  owner: new mongoose.Types.ObjectId(user._id),
                },
                {
                  $or: [
                    {
                      event_name: {
                        $regex: new RegExp(`${search}`),
                        $options: 'i',
                      },
                    },
                    {
                      address: {
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

      return {
        statusCode: 200,
        message: 'API.PARTICIPANTS_FETCHED',
        data: myEvents,
        page_number,
        page_size,
        total_attributs_events: myEventsLength,
      };
    } else {
      console.warn('from client');
      let eventJoinedMapped = [];
      //joinet event
      let event = await this.eventsMembersModel.find({
        userId: user._id,
        status: 'Accepted',
      });

      eventJoinedMapped = event.map((data) => data.eventId);
      console.log('********************', new Date(Date.now()));
      console.log(eventJoinedMapped);

      const myEvents = await this.eventsModel.aggregate([
        {
          $match: {
            $and: [
              { _id: { $nin: eventJoinedMapped } },
              { type: 'Public' },
              { end_date: { $gte: new Date(Date.now()) } },
              {
                $or: [
                  {
                    event_name: {
                      $regex: new RegExp(`${search}`),
                      $options: 'i',
                    },
                  },
                  {
                    address: { $regex: new RegExp(`${search}`), $options: 'i' },
                  },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'activity',
            foreignField: '_id',
            as: 'activity',
          },
        },
        { $unwind: '$activity' },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner',
          },
        },
        { $unwind: '$owner' },
        {
          $lookup: {
            from: 'companies',
            localField: 'owner.relatedCompany',
            foreignField: '_id',
            as: 'owner.relatedCompany',
          },
        },
        { $unwind: '$owner.relatedCompany' },
        {
          $lookup: {
            from: 'prestations',
            localField: 'owner.relatedCompany.prestations',
            foreignField: '_id',
            as: 'owner.relatedCompany.prestations',
          },
        },
        {
          $unionWith: '$owner.relatedCompany.prestations',
        },
        {
          $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
        },
        { $limit: page_number && page_size ? +page_size : 10 },
      ]);
      // .allowDiskUse(true);
      const myEventsLength = (
        await this.eventsModel.aggregate([
          {
            $match: {
              $and: [
                { _id: { $nin: eventJoinedMapped } },
                { type: 'Public' },
                { end_date: { $gte: new Date(Date.now()) } },
                {
                  $or: [
                    {
                      event_name: {
                        $regex: new RegExp(`${search}`),
                        $options: 'i',
                      },
                    },
                    {
                      address: {
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
      // const filtred = [];
      //chof le event eli ana fihom na7igohm min total

      // for (let i = 0; i < myEvents.length; i++) {
      //   const f = await this.eventsMembersModel.find({
      //     _id: myEvents[i]._id,
      //     userId: { $ne: user._id },
      //   });
      //   filtred.push(f);
      // }

      for (let i = 0; i < myEvents.length; i++) {
        const [
          face_to_face_members,
          face_to_face_count,
          online_members,
          online_count,
          invited_members,
        ] = await this.fetchEventsMembers(myEvents[i]._id);
        myEvents[i]['face_to_face_members'] = face_to_face_members;
        myEvents[i]['face_to_face_count'] = face_to_face_count;
        myEvents[i]['online_members'] = online_members;
        myEvents[i]['online_count'] = online_count;
        myEvents[i]['invited_members'] = invited_members;
      }
      return {
        statusCode: 200,
        message: 'API.PARTICIPANTS_FETCHED',
        data: myEvents,
        page_number,
        page_size,
        total_attributs_events: myEventsLength,
      };
    } //633d93eb896cf17409b0c8c0
  }
  async startEvent(startEventDto, user) {
    /* get the event */
    const { eventId } = startEventDto;
    let event = await this.eventsModel.findOne({ _id: eventId });
    if (!event['twilio_data']) {
      const twilio_data = await createTwilioRoom(eventId);
      event['twilio_data'] = { data: JSON.parse(JSON.stringify(twilio_data)) };
    } else {
      const check_room = await fetchTwilioRoomStatus(
        event['twilio_data']['data']['sid'],
      );
      if (check_room.status == 'completed') {
        const twilio_data = await createTwilioRoom(eventId);
        event['twilio_data'] = {
          data: JSON.parse(JSON.stringify(twilio_data)),
        };
      }
    }
    event['started'] = true;
    await event.save();
    return {
      statusCode: 200,
      message: 'API.EVENT_STARTED',
    };
  }

  async joinAppointmentOnline(eventId) {
    /* check if twilio is generated by the appointment pro */
    const event_data = await this.eventsModel.findOne({
      _id: eventId,
      twilio_data: { $ne: null },
    });
    if (!event_data)
      throw new HttpException(
        'API.APPOINTMENT_NOT_STARTED',
        HttpStatus.FORBIDDEN,
      );
    return {
      statusCode: 200,
      message: 'API.APPOINTMENTS_STARTED',
    };
  }

  async isJoinedEventService(user: UserToken, eventId: string) {
    const isJoined = await this.eventsMembersModel.findOne({
      userId: user._id,
      eventId,
      status: 'Accepted',
    });
    console.log(isJoined);

    if (isJoined) {
      return apiReturner(HttpStatus.OK, SUCCEEDED);
    } else {
      throw new HttpException('DOES_NOT_EXIST', HttpStatus.NOT_FOUND);
    }
  }

  async myNextEvent(userId: string, role: string) {
    var mongoose = require('mongoose');
    var id = mongoose.Types.ObjectId(userId);
    let nextEvent;
    if (role == 'PRO')
      nextEvent = await this.eventsModel
        .find({
          owner: userId,
          status: 'Active',
          start_date: {
            $gt: new Date(Date.now()),
          },
        })
        .limit(10);
    else
      nextEvent = await this.eventsMembersModel.aggregate([
        { $match: { userId: id, status: 'Accepted' } },
        {
          $lookup: {
            from: 'events',
            localField: 'eventId',
            foreignField: '_id',
            as: 'eventId',
          },
        },
        { $unwind: '$eventId' },
        {
          $match: {
            $and: [
              {
                'eventId.status': 'Active',
              },
              {
                'eventId.start_date': {
                  $gt: new Date(Date.now()),
                },
              },
            ],
          },
        },
        { $sort: { 'eventId.start_date': 1 } },
        { $limit: 10 },
      ]);
    //console.log(nextEvent.map((data) => data.eventId.start_date));
    if (nextEvent.length == 0) return null;
    if (role == 'PRO') {
      for (let i = 0; i < nextEvent.length; i++) {
        if (nextEvent[i] == null || nextEvent[i] == undefined)
          nextEvent[i] = null;
        else
          nextEvent[i] =
            Object.keys(nextEvent[i]).length == 0
              ? null
              : { eventId: nextEvent[i] };
      }
    }
    return nextEvent;
  }

  async eventsToCancel(user) {
    const events_to_cancel = await this.eventsModel.find({owner:user._id,status:"Active",ended:false})
    return events_to_cancel
  }
}
