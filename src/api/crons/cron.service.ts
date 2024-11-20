/*
https://docs.nestjs.com/providers#services
*/

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule/dist';
import { CronTime } from 'cron';
import { Model } from 'mongoose';
import {
  NEW_PRIVAT_EVENT_INVITATION,
  _app_15,
  _app_26,
  _app_fri_mon,
  _EVENT_15,
  _EVENT_26,
  _sub_14,
  _sub_2,
} from 'src/constantes/constantes';
import { notifTag } from 'src/shared/enums';
import {
  dataPayload,
  NotificationMessage,
  onNotify,
} from 'src/shared/notif.class';
import { TheNext } from '../events/schemas/event.entity';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class CronService {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(TheNext.name) private thnextModel: Model<TheNext>,
    private readonly notificationService: NotificationService,
  ) {}

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'Hours' })
  // async handleCronD() {
  //   const job = this.schedulerRegistry.getCronJob('Hours')
  //    console.log(job.lastDate());
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
  //                       { $subtract: ['$startDay', new Date()] },
  //                       1000 * 60 * 60,
  //                     ],
  //                   },
  //                 },
  //               },
  //               24 // Divide by the number of hours in a day (24) to get days
  //             ]
  //           }
  //         },
  //       },
  //     ]);
  //     const readyToSend14 = await this.thnextModel.aggregate([{ $match: { soonInD: 14,  } }])
  //     const readyToSend2 = await this.thnextModel.aggregate([{ $match: { soonInD: 2,  } }])

  //     console.log(readyToSend14);
  //     console.log(readyToSend2);
  //     console.log('send notification D');
  //     //todo  send notification then delete the next
  //   }
  // }

  // @Cron(CronExpression.EVERY_HOUR, { name: 'Hours' })
  // async handleCronH() {
  //      const job = this.schedulerRegistry.getCronJob('Hours')
  //    console.log(job.lastDate());
  //   if ((await this.thnextModel.countDocuments()) != 0) {
  //     await this.thnextModel.updateMany({ soonInH: { $gt: 26 } }, [
  //       {
  //         $set: {
  //           soonInH: {
  //             $sum: [
  //               0, {
  //                 $round: {
  //                   $toDouble: {
  //                     $divide: [
  //                       { $subtract: ['$startDay', new Date()] },
  //                       1000 * 60 * 60,
  //                     ],
  //                   },
  //                 },
  //               },
  //             ]
  //           }
  //         },
  //       },
  //     ]);
  //     const readyToSend = await this.thnextModel.aggregate([{ $match: { soonInH: 26, soonInM: null } }])

  //     console.log(readyToSend);
  //     console.log('send notification H');
  //     //todo  send notification then delete the next
  //   }
  // }
  // @Cron(CronExpression.EVERY_MINUTE, { name: 'Minutes' })
  // async handleCronM() {
  //   if ((await this.thnextModel.countDocuments()) != 0) {
  //     await this.thnextModel.updateMany({ soonInM: { $gte: 15 } }, [
  //       {
  //         $set: {
  //           soonInM: {
  //             $sum: [
  //               0, {
  //                 $round: {
  //                   $toDouble: {
  //                     $divide: [
  //                       { $subtract: ['$startDay', new Date()] },
  //                       1000 * 60,
  //                     ],
  //                   },
  //                 },
  //               },
  //             ]
  //           }
  //         },
  //       },
  //     ]);

  //     // const readyToSend = await this.thnextModel.aggregate([{ $match: { soonIn: 26 } }])
  //     const readyToSend15 = await this.thnextModel.aggregate([{ $match: { soonInM: 15, soonInH: { $lte: 26 } } }])

  //     console.log(readyToSend15);
  //     console.log('send notification M');
  //   }
  // }

  @Cron('0 14 * * 5', { name: 'evryFriday' })
  async handleCronEvryFriday() {
    // Your code here
    const fridaycronsnotif = await this.thnextModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'toNotif',
          foreignField: '_id',
          as: 'toNotif',
        },
      },
      {
        $unwind: {
          path: '$toNotif',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'notifPayload',
          foreignField: '_id',
          as: 'notifPayload',
        },
      },
      {
        $unwind: {
          path: '$notifPayload',
        },
      },
      {
        $match: {
          fridayNodif: true,
          soonInD: 3,
        },
      },
    ]);

    fridaycronsnotif.map(async (usernotif) => {
      let message: NotificationMessage = {
        data: dataPayload({
          tag: '_app_fri_mon',
          firstName: usernotif?.notifPayload?.firstName,
          lastName: usernotif?.notifPayload?.lastName,
          start_date: usernotif.comparativeDate.toISOString(),
          badge: await this.notificationService.badge(usernotif._id),
        }),
        notification: _app_fri_mon(
          await this.notificationService.badge(usernotif._id),
        ),
      };
      await onNotify(
        null,
        usernotif.toNotif,
        this.notificationService,
        message,
        true,
      );

      
    });
  }
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'days' })
  async handleCronD() {
    const job = this.schedulerRegistry.getCronJob('Hours');
    console.log(job.lastDate());
    if ((await this.thnextModel.countDocuments()) != 0) {
      await this.thnextModel.updateMany({ soonInD: { $gte: 1 } }, [
        {
          $set: {
            soonInD: {
              $round: {
                $divide: [
                  {
                    $round: {
                      $toDouble: {
                        $divide: [
                          { $subtract: ['$comparativeDate', new Date()] },
                          1000 * 60 * 60,
                        ],
                      },
                    },
                  },
                  24, // Divide by the number of hours in a day (24) to get days
                ],
              },
            },
          },
        },
      ]);

      const readyToSend14 = await this.thnextModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'toNotif',
            foreignField: '_id',
            as: 'toNotif',
          },
        },
        {
          $unwind: {
            path: '$toNotif',
          },
        },
        { $match: { soonInD: 0, type: 'subscription' } },
      ]);
      const readyToSend2 = await this.thnextModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'toNotif',
            foreignField: '_id',
            as: 'toNotif',
          },
        },
        {
          $unwind: {
            path: '$toNotif',
          },
        },
        { $match: { soonInD: 2, type: 'subscription' } },
      ]);

      console.log(readyToSend14.length);
      console.log(readyToSend2.length);

      if (readyToSend2.length > 0) {
        readyToSend2.map(async (usernotif) => {
          let message: NotificationMessage = {
            data: dataPayload({
              tag: '_sub_2',
              // firstName: 'firstName',
              // lastName: 'lastName',
              start_date: usernotif.comparativeDate.toISOString(),
              badge: await this.notificationService.badge(usernotif._id),
            }),
            notification: _sub_2(
              await this.notificationService.badge(usernotif._id),
            ),
          };
          await onNotify(
            null,
            usernotif.toNotif,
            this.notificationService,
            message,
            true,
          );

          await this.thnextModel.deleteOne({ _id: usernotif._id });
        });
      }

      if (readyToSend14.length > 0) {
        readyToSend14.map(async (usernotif) => {
          let message: NotificationMessage = {
            data: dataPayload({
              tag: '_sub_14',
              // firstName: 'firstName',
              // lastName: 'lastName',
              start_date: usernotif.comparativeDate.toISOString(),
              badge: await this.notificationService.badge(usernotif._id),
            }),
            notification: _sub_14(
              await this.notificationService.badge(usernotif._id),
            ),
          };
          await onNotify(
            null,
            usernotif.toNotif,
            this.notificationService,
            message,
            true,
          );
        
        });
      }

      console.log('send notification D');
      //todo  send notification then delete the next
    }
  }
  @Cron(CronExpression.EVERY_HOUR, { name: 'Hours' })
  async handleCronH() {
    const job = this.schedulerRegistry.getCronJob('Hours');
    console.log(job.lastDate());
    if ((await this.thnextModel.countDocuments()) != 0) {
      await this.thnextModel.updateMany({ soonInH: { $gte: 1 } }, [
        {
          $set: {
            soonInH: {
              $round: {
                $toDouble: {
                  $divide: [
                    { $subtract: ['$comparativeDate', new Date()] },
                    1000 * 60 * 60,
                  ],
                },
              },
            },
          },
        },
      ]);

      const readyToSend26 = await this.thnextModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'toNotif',
            foreignField: '_id',
            as: 'toNotif',
          },
        },
        {
          $unwind: {
            path: '$toNotif',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'notifPayload',
            foreignField: '_id',
            as: 'notifPayload',
          },
        },
        {
          $unwind: {
            path: '$notifPayload',
          },
        },
        { $match: { soonInH: 26 } },
      ]);

      console.log(readyToSend26.length);
      if (readyToSend26.length > 0) {
        readyToSend26.map(async (usernotif) => {
          switch (usernotif.type) {
            case 'appointment': {
              let message: NotificationMessage = {
                data: dataPayload({
                  tag: '_app_26',
                  firstName: usernotif?.notifPayload?.firstName,
                  lastName: usernotif?.notifPayload?.lastName,
                  start_date: usernotif.comparativeDate.toISOString(),
                  badge: await this.notificationService.badge(usernotif._id),
                }),
                notification: _app_26(
                  await this.notificationService.badge(usernotif._id),
                ),
              };
              await onNotify(
                null,
                usernotif.toNotif,
                this.notificationService,
                message,
                true,
              );
             
              break;
            }
            case 'event': {
              let message: NotificationMessage = {
                data: dataPayload({
                  tag: '_EVENT_26',
                  eventName: usernotif.event?.event_name,
                  eventId: usernotif.event?._id.toString(),
                  start_date: usernotif.comparativeDate.toISOString(),
                  badge: await this.notificationService.badge(usernotif._id),
                }),
                notification: _EVENT_26(
                  await this.notificationService.badge(usernotif._id),
                ),
              };
              await onNotify(
                null,
                usernotif.toNotif,
                this.notificationService,
                message,
                true,
              );
             
              break;
            }
          }
        });
      }

      console.log('send notification H');
      //todo  send notification then delete the next
    }
  }
  @Cron(CronExpression.EVERY_MINUTE, { name: 'Minutes' })
  async handleCronM() {
    if ((await this.thnextModel.countDocuments()) != 0) {
      await this.thnextModel.updateMany(
        {
          $or: [
            {
              $and: [
                { soonInH: { $lte: 2 } },
                { soonInH: { $gte: 0 } },
                { soonInM: { $gte: 16 } },
              ],
            },
            {
              $and: [{ soonInM: { $lte: 120 } }, { soonInM: { $gte: 16 } }],
            },
          ],
        },
        [
          {
            $set: {
              soonInM: {
                $sum: [
                  0,
                  {
                    $round: {
                      $toDouble: {
                        $divide: [
                          { $subtract: ['$comparativeDate', new Date()] },
                          1000 * 60,
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      );

      // const readyToSend = await this.thnextModel.aggregate([{ $match: { soonIn: 26 } }])
      const readyToSend152 = await this.thnextModel.find({ soonInM: 15 }).populate(['toNotif','notifPayload','event'])
      console.log('readyToSend152: ',readyToSend152);
      
      // const readyToSend15 = await this.thnextModel.aggregate([
      //   { $match: { soonInM: {$eq:15} } },
      //   {
      //     $lookup: {
      //       from: 'users',
      //       localField: 'toNotif',
      //       foreignField: '_id',
      //       as: 'toNotif',
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path: '$toNotif',
      //     },
      //   },
      //   {
      //     $lookup: {
      //       from: 'users',
      //       localField: 'notifPayload',
      //       foreignField: '_id',
      //       as: 'notifPayload',
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path: '$notifPayload',
      //     },
      //   },
       
      // ]);

   //   console.log("readyToSend15=>",readyToSend15.length);
      if (readyToSend152.length > 0) {
        readyToSend152.map(async (usernotif) => {
          console.log(usernotif.type);
          console.log(' ==> ', usernotif.type);
          switch (usernotif.type) {
            case 'appointment': {
              try {
              let message: NotificationMessage = {
                data: dataPayload({
                  tag: '_app_15',
                  firstName: usernotif?.notifPayload["firstName"],
                  lastName: usernotif?.notifPayload['lastName'],
                  start_date: new Date(usernotif["comparativeDate"]).toISOString(),
                  badge: await this.notificationService.badge(usernotif["_id"].toString()),
                }),
                notification: _app_15(
                  await this.notificationService.badge(usernotif["_id"].toString()),
                ),
              };
              await onNotify(
                null,
                usernotif.toNotif,
                this.notificationService,
                message,
                true,
              );
                await this.thnextModel.deleteOne({ _id: usernotif._id });
              } catch (e) {
                console.log(e);  
              }
              break;
            }
            case 'event': {
              try {
                console.log('inside event ',usernotif);
                let message: NotificationMessage = {
                  data: dataPayload({
                    tag: '_EVENT_15',
                    eventName: usernotif["event"]?.event_name,
                    eventId: usernotif.event?._id.toString(),
                    start_date: new Date(usernotif["comparativeDate"]).toISOString(),
                    badge: await this.notificationService.badge(usernotif["_id"].toString()),
                  }),
                  notification: _EVENT_15(
                    await this.notificationService.badge(usernotif["_id"].toString()),
                  ),
                };
                await onNotify(
                  null,
                  usernotif.toNotif,
                  this.notificationService,
                  message,
                  true,
                );
                await this.thnextModel.deleteOne({ _id: usernotif._id });

               } catch (e) {
                console.log(e);  
              }
            

              break;
            }
            default:
              break;
          }
        });
      }

      await this.thnextModel.deleteMany({
        $or: [
          { soonInM: { $lte: 14 } },
          { soonInH: { $lt: 0 } },
          { soonInD: { $lt: 0 } },
        ],
      });
      console.log('send notification M');
    }
  }
}
