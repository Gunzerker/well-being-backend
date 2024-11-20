/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Post, Query, UseGuards, Get, Body } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessagingOptions } from 'firebase-admin/lib/messaging/messaging-api';

import { GetUser } from 'src/decorators/decotator.user';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { NotificationMessage } from 'src/shared/notif.class';
import { UserToken } from 'src/shared/tokenModel';
import { PayloadNotificationTestDto } from './notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications-ressources')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notifServices: NotificationService) { }

  @Post('test')
  async test(@Body() body: PayloadNotificationTestDto) {
    console.log(body.message);
    console.log(body.option);
    console.log(body.deviceToken);

    const options: MessagingOptions = {
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
    // let messagedyc = JSON.parse(body.message.toString());
    // let optinsDyc = JSON.parse(body.option);

    // let  message = {
    //     data: {
    //       Nick: 'Mario',
    //       Room: 'PortugalVSDenmark',
    //       tag: 'CANCLD_APP_FC',
    //       content_available: '1',
    //     },

    //     notification: {
    //       title: 'This is a Notification',
    //       body: 'This is the body of the notification messageo.',
    //       tag: 'CANCLD_APP_FC',
    //       icon: 'ic',
    //       badge: '106',
    //     },
    //   };

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
    //         aps: {
    //           content_available: true,
    //         },
    //       },
    //     },
    //     content_available: true,
    //   };
    //  console.log(options);

    // // return await this.notifServices.sendNotification(
    // //   { title: 'beYANG', body: 'hi yasss' },
    // //   { test: 'hola yasss' },
    // //   '15',
    // //   'c29Vih9ClET-jH4swFVw_0:APA91bE9N-r-r0NcRHrW-uThdDzUHGhtDGWzm_Jv7baQJGA6nZkHAi5KEE7a1IqqH1vxvmk8-fasDMShM1_4KRTEEdbGtggzIsKRsDgZjks-YhzW2a1FHnlX-1N7OWKeS31hpLOp_BS0',
    // // );

    return this.notifServices.sendNotificationTo(
      body.message as NotificationMessage,
      body.deviceToken,
      options,
    );
  }
  @ApiResponse({
    status: 200,
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @Get('notifications-liste')
  async notificationsListe(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @GetUser() me: UserToken,
  ) {
    page_size ? page_size : 10;

    return await this.notifServices.notificationsListeService(
      me,
      page_size,
      page_number,
    );
  }

  @ApiResponse({
    status: 200,
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Get('notifications-read')
  async notifeStatus(
    @Query('idNotif') idNotif: string,
    @GetUser() me: UserToken,
  ) {
    return await this.notifServices.notifeStatusService(me, idNotif);
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  // @Get('notifications-for-admin')
  // async notificationsListeAdminController(
  //   @GetUser() me: UserToken,
  //   @Query('page_size') page_size: number,
  //   @Query('page_number') page_number: number,
  // ) {
  //   return await this.notifServices.notificationsListeAdminService(
  //     me,
  //     page_number,
  //     page_size,
  //   );
  // }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('notifications-ListeAdminService')
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  async notificationsListeAdminC(
    @GetUser() me: UserToken,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
  ) {
    page_size ? page_size : 10;

    return await this.notifServices.notificationsListeAdminService(
      me,
      page_size,
      page_number,
    );
  }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('delete-my-notif')
  @ApiQuery({ name: 'id_notif', type: String, required: true })
  async deleteMyNotif(
    @GetUser() me: UserToken,
    @Query('id_notif') id_notif: string,
  ) {
    return await this.notifServices.deletNotifService(id_notif, me);
  }
}
