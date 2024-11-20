/*
https://docs.nestjs.com/controllers#controllers
*/

import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SOME_CREDENTIALS_INVALID, SUCCEEDED } from 'src/constantes/constantes';

import { GetUser } from 'src/decorators/decotator.user';
import { Roles } from 'src/decorators/privilage.decorator';

import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { privilege, quotationsType } from 'src/shared/enums';
import { apiReturner } from 'src/shared/returnerApi';
import { UserToken } from 'src/shared/tokenModel';
import { AccountComplitingDto } from './dto/accountCompliting';
import {
  BackofficeNotifyAllUser,
  BackofficeNotifyUser,
  EditPasswordDto,
  EditProfilDto,
  ProDto,
  localUserDto,
} from './dto/edit.profil.dto';
import { agendaUserDto } from './dto/agenda.user.dto';
import { EmailPoke } from './dto/email.poke.dto';
import {
  QuotationDto,
  QuotationReplyDto,
  ReplyQuotationDto,
} from './dto/quotation.dto';
import { RatingDto, fetchRatingDto } from './dto/rating.dto';
import { User } from './models/user.model';
import { UsersService } from './users.service';
import { referralCodeSenderDto } from '../auth/dto/createUserDto';
import { generateTokenTwilio } from 'src/shared/generateTokenTwilio';
import { createTwilioRoom } from 'src/shared/createTwilioRoom';
import { ConfigNotifications } from './dto/config.notif.dto';
import { SubscriptionGuardPermission } from 'src/guard/permission.subscription.guard';
import { setTokenDto } from './dto/set.token.dto';

@ApiTags('users-ressources')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }
  



  @Get('/siret/:siret')
  findOne(@Param('siret') siret: string) {
    return this.usersService.siretVerificaation(siret);
  }

  @Post('complitingInfo')
  compitingAccountInfo(@Body() userData: AccountComplitingDto) {}

  @Post('update')
  @UseGuards(JwtAuthGuard)
  async updateUsers(@Body() attributes: any, @GetUser() user: User) {
    return await this.usersService.updateServices(user._id, attributes);
  }
  //!-------------------------------------------------------sprint2
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT, privilege.PRO)
  @ApiBearerAuth()
  @Post('poke-pro')
  async onPokeSomeone(@Body() data: EmailPoke, @GetUser() user: User) {
    return await this.usersService.onPokeService(data.email, user._id);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT, privilege.ADMIN, privilege.PRO, privilege.EMPLOYEE)
  @Get('pro-cards-details/:user_id')
  async getProCardDetails(
    @Param('user_id') _id: string,
    @GetUser() me: UserToken,
  ) {
    return await this.usersService.getProCardDetailsService(_id, me);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    // summary: '☢️⛔⛔ Do not try this service! ⛔🚫☢️ Back-end only',
    summary: '🚀 This service is available ! ',
  })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiQuery({ name: 'subCatName', type: String, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: false })
  @ApiQuery({ name: 'latitude', type: Number, required: false })
  @ApiQuery({ name: 'ray', type: Number, required: false })
  @Get('liste-pro-and-search-v2')
  //todo next ... adding authorization layer
  async toSearchV2(
    @GetUser() user: User,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('toSearch') toSearch: string,
    @Query('subCatName') cat: string,
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('ray') ray: number,
  ) {
    try {
      page_size ? (page_size = page_size) : (page_size = 10);
      return await this.usersService.getProCardAndSearchv3(
        user._id,
        cat,
        page_number,
        page_size,
        toSearch,
        longitude,
        latitude,
      );
    } catch (e) {
      // };
      console.log(
        'something went wrong in usersService.getProCardAndSearchv3 ' + e,
      );
      throw new HttpException(
        'something went wrong in toSearch usersService.getProCardAndSearchv3 ' +
          e,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT)
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiBearerAuth()
  @Get('favourite-liste')
  async getFavourites(
    @GetUser() user: User,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('toSearch') toSearch: string,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    return await this.usersService.getFavService(
      user._id,
      page_number,
      page_size,
      toSearch,
    );
  }

  // //!----------------------------------------- -- - - - - -- - - - - - - - - - - - - - - - ----------------------------------favoutites
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT)
  @Post('add-or-remove-from-favourites/:idPro')
  async addTofavourites(
    @Param('idPro') idPro: string,
    @GetUser() toMe: UserToken,
  ) {
    return await this.usersService.addTofavouriteServicev2(toMe, idPro);
  }
  //!-
  @ApiBearerAuth()
  @ApiOperation({
    // summary: '☢️⛔⛔ Do not try this service! ⛔🚫☢️ Back-end only',
    summary: '🚀 This service is available ! ',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT)
  @Post('add-or-remove-from-favourites-v2/:idPro')
  async addTofavouritesv2(
    @Param('idPro') idPro: string,
    @GetUser() toMe: UserToken,
  ) {
    console.log('from here');
    return await this.usersService.addTofavouriteServicev2(toMe, idPro);
  }

  //!----------------------------------------------------------------
  @ApiBearerAuth()
  @ApiOperation({
    // summary: '☢️⛔⛔ Do not try this service! ⛔🚫☢️ Back-end only',
    summary: '🚀 This service is available ! ',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT)
  @Post('ask-for-quotation-to-v2/:toProId')
  async askForQuotationV2(
    @Param('toProId') toProId: string,
    @Body() quotationData: QuotationDto,
    @GetUser() formUser: UserToken,
  ) {
    return await this.usersService.sendQuotationv2(
      formUser,
      toProId,
      quotationData,
    );
  }
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiOperation({
    //summary: '☢️⛔⛔ Do not try this service! ⛔🚫☢️ Back-end only',
    summary: '✅ This service is available ! ✅',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.PRO, privilege.CLIENT)
  @Get('quotations-for-pro-v2')
  async getQuotationV2(
    @GetUser() user: UserToken,
    @Query('toSearch') toSearch: string,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
  ) {
    console.log(user._id);
    page_size ? (page_size = page_size) : (page_size = 10);

    return await this.usersService.getProQuotations(
      user,
      page_number,
      page_size,
      toSearch,
    );
  }
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.PRO)
  @Get('quotations-for-Pro')
  async getQuotation(
    @GetUser() user: UserToken,
    @Query('toSearch') toSearch: string,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
  ) {
    console.log(user._id);
    page_size ? (page_size = page_size) : (page_size = 10);

    const myQuotations = await this.usersService.getQuotations(
      user,
      page_number,
      page_size,
      toSearch,
    );

    return myQuotations;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT, privilege.PRO)
  @Get('quotations/:id_Quo')
  async getQuotationdetails(
    @GetUser() user: User,
    @Param('id_Quo') id_Quo: string,
  ) {
    const myQuotations = await this.usersService.getQuotationById(id_Quo);
    return {
      statusCode: 200,
      message: 'API.QUOTATION_FETCHED',
      data: myQuotations,
    };
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'devis', maxCount: 1 },
      { name: 'join', maxCount: 1 },
    ]),
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.PRO)
  @ApiBody({
    description: 'images',
    type: ReplyQuotationDto,
  })
  @Post('reply-to-quotation/:_idQuo')
  async replyQuotation(
    @GetUser() user: User,
    @Param('_idQuo') _idQuo: string,
    @Body() data: QuotationReplyDto,
    @UploadedFiles()
    files: { devis: Express.Multer.File; join?: Express.Multer.File },
  ) {
    const payload: QuotationReplyDto = {
      name: data.name,
      duration: data.duration,
      comment: data.comment,
      fee: data.fee,
      onLineMeeting: data.onLineMeeting,
    };

    if (files.join === undefined) {
      console.log('from one devis');
      return await this.usersService.replyToQuotationv2(
        user,
        _idQuo,
        payload,
        files.devis[0],
      );
    } else {
      return await this.usersService.replyToQuotationv2(
        user,
        _idQuo,
        payload,
        files.devis[0],
        files.join[0],
      );
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT, privilege.PRO, privilege.EMPLOYEE)
  @Get('/welcomeScreen')
  async welcomeScreen(@GetUser() user: UserToken) {
    return await this.usersService.welcomeScreen(user);
  }

  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'toSearch', type: String, required: true })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT, privilege.PRO, privilege.EMPLOYEE)
  @Get('global-search')
  async globalSearch(
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @GetUser() user: UserToken,
    @Query('toSearch') toSearch: string,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    return await this.usersService.globalSearchService(
      user,
      page_number,
      page_size,
      toSearch,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/updateAvailabilty')
  async updateAvailabilty(
    @Query('available') available: boolean,
    @GetUser() user: UserToken,
  ) {
    return await this.usersService.updateAvailabilty(user, available);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/updateUserAgendaConfig')
  async updateUserAgendaConfig(
    @Body() data: agendaUserDto,
    @GetUser() user: UserToken,
  ) {
    return await this.usersService.updateUserAgendaConfig(user, data);
  }

  //!  - - - - - - SPRINT 3- - - - - - - - SPRINT 3 - - - - - - SPRINT 3- - - - - - - - SPRINT 3 - - - - - - SPRINT 3- - - - - - - - SPRINT 3 - - - - - - SPRINT 3- - - - - - - - SPRINT 3
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiBody({
    description: 'images',
    type: EditProfilDto,
  })
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆*  ' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT, privilege.EMPLOYEE, privilege.PRO)
  @Post('edit-profil')
  //@HttpCode(200)
  async editProfil(
    @GetUser() user: UserToken,
    @UploadedFile()
    file,
    @Body() attributes: EditProfilDto,
  ) {
    let parsed_localization: { longitude: string; latitude: string };
    if (attributes.localization_string) {
      console.log(attributes.localization_string);

      parsed_localization = JSON.parse(attributes.localization_string);
      delete attributes['localization_string'];
      attributes['localization'] = {
        longitude: parsed_localization.longitude,
        latitude: parsed_localization.latitude,
      };
    }
    console.log(attributes);

    switch (user.role) {
      case privilege.PRO: {
        return this.usersService.editProfile(user._id, attributes);
      }
      case privilege.CLIENT: {
        Object.keys(attributes).forEach((key) => {
          if (key === 'siretNumber' || key === 'postalCode') {
            delete attributes[key];
          }
        });
        if (file) {
          attributes.image = file;
          return this.usersService.editProfile(user._id, attributes);
        } else {
          return this.usersService.editProfile(user._id, attributes);
        }
      }
      case privilege.EMPLOYEE: {
        Object.keys(attributes).forEach((key) => {
          if (
            key === 'siretNumber' ||
            key === 'companyName' ||
            key === 'address' ||
            key === 'postalCode' ||
            key === 'email' ||
            key === 'city' ||
            key === 'phoneNumber' ||
            key === 'localization'
          ) {
            delete attributes[key];
          }
        });

        return this.usersService.editProfile(user._id, attributes);
      }
      default:
        throw new HttpException('bad request', HttpStatus.BAD_REQUEST);
    }
  }
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.CLIENT, privilege.EMPLOYEE, privilege.PRO)
  @ApiBearerAuth()
  @Post('edit-password')
  async editPassword(
    @GetUser() user: UserToken,
    @Body() payload: EditPasswordDto,
  ) {
    const payloadType = Object.assign(EditPasswordDto, payload).name;
    // payload as ,

    console.log(payloadType, Object.assign(EditPasswordDto, payload));
    return await this.usersService.updateServices(
      user._id,
      //!clone
      Object.assign(EditPasswordDto, payload),
    );
  }
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })

  //@ApiOperation({ summary: ' 🚧 in process 🚧' })
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.PRO)
  @ApiBearerAuth()
  @Get('leads-my-clients')
  async clientListe(
    @GetUser() user: UserToken,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    return await this.usersService.getProClients(
      user,
      page_number,
      page_size,
      null,
      null,
      false,
    );
  }
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.PRO)
  @ApiBearerAuth()
  @Get('leads-my-pro-network')
  async proNetwork(
    @GetUser() user: UserToken,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    return await this.usersService.getProNetwork(user, page_number, page_size);
  }
  ///!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!pagination here
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.CLIENT, privilege.PRO, privilege.EMPLOYEE)
  @ApiBearerAuth()
  @Post('rating/:toUserId')
  async proRating(
    @GetUser() me: UserToken,
    @Param('toUserId') toUserId: string,
    @Body() ratingPayload: RatingDto,
  ) {
    if (
      ratingPayload.value > 5 ||
      ratingPayload.value < 0 ||
      me._id == toUserId
    ) {
      throw new HttpException('Invalid rating ', HttpStatus.BAD_REQUEST);
    }
    const done = await this.usersService.userGetRatingService(
      me,
      toUserId,
      ratingPayload,
    );
    //  await this.usersService.createClientShip(toUserId, me._id);
    return done;
  }

  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @ApiQuery({ name: 'page_number', type: Number, required: false })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.CLIENT, privilege.PRO, privilege.EMPLOYEE)
  @ApiBearerAuth()
  @Get('ratings/:userId')
  async getproRating(@Param('userId') proId: string,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,) {
    page_size ? (page_size = page_size) : (page_size = 100);
    page_number ? (page_number = page_number) : (page_number = 1);
    return await this.usersService.getUserRatingService(proId, page_number, page_size);
    //todo : rating def
  }

  @ApiQuery({ name: 'page_number', type: Number, required: false })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'categoryId', type: String, required: false })
  @Get('fetchProWithCategoryFilter')
  async fetchProWithCategoryFilter(
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('categoryId') categoryId: string,
    @Query('search') search: string,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);
    return await this.usersService.fetchProWithCategoryFilter(
      categoryId,
      page_size,
      page_number,
      search
    );
  }
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Post('/referral-code-sender')
  @ApiBearerAuth()
  @Roles(privilege.PRO, privilege.CLIENT, privilege.EMPLOYEE)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async referralCodeSender(
    @GetUser() userPro: User,
    @Body() emails: referralCodeSenderDto,
  ) {
    return await this.usersService.referralCodeSenderService(userPro, emails);
  }

  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Post('user/:id')
  @ApiBearerAuth()
  @Roles(privilege.PRO, privilege.CLIENT, privilege.EMPLOYEE, privilege.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async getUserById(@Param('id') id: string) {
    return await this.usersService.getUserById(id);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Post('/generateTwilioToken')
  async generateTwilioToken(@GetUser() user: User) {
    const user_data = await this.usersService.findUserBy({ _id: user._id });
    return generateTokenTwilio({
      identity: user_data._id,
      firstName: user_data.firstName,
      lastName: user_data.lastName,
      profileImage: user_data.profileImage,
      _id: user_data._id,
      type: user_data.type,
    });
  }

  @Post('/createTwilioRoom')
  async createTwilioRoom(@Query('uniqueName') uniqueName: string) {
    return createTwilioRoom(uniqueName);
  }

  @Post('/pro-clients')
  async updateSubscriptionPrice(@Body() proId: ProDto) {
    return await this.usersService.ProClients(proId);
  }

  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Post('/config-notifications')
  @ApiBearerAuth()
  @Roles(privilege.PRO, privilege.CLIENT, privilege.EMPLOYEE)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async configNotifications(
    @GetUser() user: UserToken,
    @Body() newConfig: ConfigNotifications,
  ) {
    console.log({ ...newConfig });

    switch (user.role) {
      case privilege.PRO: {
        Object.keys(newConfig).forEach((key) => {
          if (
            key === 'c_notif_posp_or_dec_appointment' ||
            key === 'c_notif_begin_event_soon' ||
            key === 'c_notif_for_appointemnt_accepted'
          ) {
            delete newConfig[key];
          }
        });
        console.log({ ...newConfig });
        const isdone = await this.usersService.configNotifications(
          user,
          newConfig,
        );
        if (isdone == true) {
          return apiReturner(HttpStatus.CREATED, SUCCEEDED);
        } else {
          throw new HttpException(
            SOME_CREDENTIALS_INVALID,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      case privilege.CLIENT: {
        Object.keys(newConfig).forEach((key) => {
          if (
            key === 'p_notif_new_event_signup' ||
            key === 'p_notif_new_event_signup' ||
            key === 'ep_notif_ask_for_demande'
          ) {
            delete newConfig[key];
          }
        });
        const isdone = await this.usersService.configNotifications(
          user,
          newConfig,
        );
        if (isdone == true) {
          return apiReturner(HttpStatus.CREATED, SUCCEEDED);
        } else {
          throw new HttpException(
            SOME_CREDENTIALS_INVALID,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      case privilege.EMPLOYEE: {
        Object.keys(newConfig).forEach((key) => {
          if (
            key === 'c_notif_posp_or_dec_appointment' ||
            key === 'c_notif_begin_event_soon' ||
            key === 'c_notif_for_appointemnt_accepted' ||
            key === 'p_notif_new_event_signup' ||
            key === 'pc_notif_posp_or_dec_appointment'
          ) {
            delete newConfig[key];
          }
        });
        const isdone = await this.usersService.configNotifications(
          user,
          newConfig,
        );
        if (isdone == true) {
          return apiReturner(HttpStatus.CREATED, SUCCEEDED);
        } else {
          throw new HttpException(
            SOME_CREDENTIALS_INVALID,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      default:
        throw new HttpException('bad request', HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Get('/config-notifications')
  @ApiBearerAuth()
  @Roles(privilege.PRO, privilege.CLIENT, privilege.EMPLOYEE)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async userConfigNotif(@GetUser() user: UserToken) {
    return await this.usersService.userConfigNotifService(user);
  }

  @Get('/fetchCompanyEmployees')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  async fetchCompanyEmployees(
    @GetUser() user: UserToken,
    @Query('companyId') companyId: string,
  ) {
    return await this.usersService.fetchCompanyEmployees(companyId, user);
  }


  @Get('/fetchCompanyEmployeesDispo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  async fetchCompanyEmployeesDispo(
    @GetUser() user: UserToken,
    @Query('companyId') companyId: string,
  ) {
    return await this.usersService.fetchCompanyEmployeesDispo(companyId, user);
  }
  //!from Walid :✂️- - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - -

  @ApiBearerAuth()
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/export')
  async exportTransfer(
    @GetUser() me: UserToken,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return await this.usersService.exportTransferService(me, month, year);
  }

  @ApiOperation({ summary: ' 🚧 in process 🚧 sprint4' })
  @Get('T/export-quotations')
  @ApiQuery({ name: 'month', type: String, required: true })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.PRO)
  async exportQuotations(
    @GetUser() user: UserToken,
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('toSearch') toSearch: string,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    const type = quotationsType.T;
    return await this.usersService.exportQuotationService(
      user,
      month,
      year,
      type,
      { page_number, page_size },
      toSearch,
    );
  }

  @ApiOperation({ summary: ' 🚧 in process 🚧 sprint4' })
  @Get('NT/export-quotations')
  @ApiQuery({ name: 'month', type: String, required: true })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.PRO)
  async exportQuotationsNt(
    @GetUser() user: UserToken,
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('toSearch') toSearch: string,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    const type = quotationsType.NT;
    return await this.usersService.exportQuotationService(
      user,
      month,
      year,
      type,
      { page_number, page_size },
      toSearch,
    );
  }

  // @Get('export-client-data/:id')
  // // @ApiBearerAuth()
  // // @UseGuards(JwtAuthGuard, RolesGuard)
  // // @Roles(privilege.PRO)
  // // @Header('Content-Type', 'application/csv')
  // // @Header('Content-Disposition', 'attachment; filename="client-details.csv"')
  // async exportClientData(
  //   @GetUser() me: UserToken,
  //   @Param('id') userId: string,
  // ) {
  //   const data = await this.usersService.exportClient('me', userId);
  //   return { data };
  // }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/fetchEmployeeAgenda')
  async fetchEmployeeAgenda(
    @Query('employeeId') employeeId: string,
    @GetUser() user: UserToken,
  ) {
    return await this.usersService.fetchEmployeeAgenda(user, employeeId);
  }

  @UsePipes(ValidationPipe)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.PRO)
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiBearerAuth()
  @Get('my-clients-export')
  async clientListExport(
    @GetUser() user: UserToken,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('toSearch') toSearch: string,
    @Query('year') year: string,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    return await this.usersService.getProClients(
      user,
      page_number,
      page_size,
      toSearch,
      year,
      true,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('export-client-data/:id')
  async getFile(@GetUser() me: UserToken, @Param('id') id: string, @Res() res) {
    // const { parse } = require('csv-parse');

    const data = await this.usersService.exportClient(me._id, id);
    //res.setTimeout(1000);
    // res.set({
    //   'Content-Type': 'application/csv',
    //   'Content-Disposition': 'attachment; filename=' + filename,
    // });
    console.log('hola', data);

    //return res.send(fileLink);
    res.send(apiReturner(HttpStatus.OK, SUCCEEDED, data));

    // return res.redirect('/' + filename);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/deleteEmployee')
  async deleteEmployee(
    @Query('employeeId') employeeId: string,
    @GetUser() user: UserToken,
  ) {
    return await this.usersService.deleteEmployee(user, employeeId);
  }

  @Post('/fetchRating')
  async fetchRating(@Body() fetchRatingDto: fetchRatingDto) {
    return await this.usersService.fetchRating(fetchRatingDto);
  }

  @Post('/updateAdminRating')
  async updateRating(@Body() fetchRatingDto: fetchRatingDto) {
    return await this.usersService.updateRating(fetchRatingDto);
  }

  @Get('/getAllUsersStats')
  async fetchAllUsers() {
    return await this.usersService.fetchAllUsersStats();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/fetchProById')
  async fetchProById(
    @Query('proId') proId: string,
    @GetUser() user: UserToken,
  ) {
    return await this.usersService.fetchProById(user, proId);
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 404,
    description: '<h4><b>Not a member</b>',
  })
  @ApiResponse({
    status: 200,
    description: '<h4><b>A Member</b>',
  })
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/is-joined-event')
  async isJoined(
    @GetUser() user: UserToken,
    @Query('eventId') eventId: string,
  ) {
    return await this.usersService.isJoinedService(user, eventId);
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 404,
    description: '<h4><b>Not rated</b>',
  })
  @ApiResponse({
    status: 200,
    description: '<h4><b>Rated</b>',
  })
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/is-rating')
  async isRating(
    @GetUser() user: UserToken,
    @Query('toId') toId: string,
    @Query('appointementId') appointementId: string,
  ) {
    return await this.usersService.isRatingService(
      user._id,
      toId,
      appointementId,
    );
  }
  @ApiOperation({ summary: ' 🚧 in process 🚧 ' })
  @Get('/get-pro-by-emp')
  async getProByEmp(
    @GetUser() user: UserToken,
    @Query('IdEmpolyee') IdEmpolyee: string,
  ) {
    return await this.usersService.getProByEmployee(IdEmpolyee);
  }
  @ApiBearerAuth()
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Post('/leads-transfer-notify')
  async leadTransfer(
    @GetUser() me: UserToken,
    @Query('IdUser') IdUser: string,
  ) {
    return await this.usersService.leadTransferNotify(me._id, IdUser);
  }

  @Post('/sendNotificationToUser')
  async sendNotificationToUser(
    @Body() backofficeNotifyUser: BackofficeNotifyUser,
  ) {
    return await this.usersService.sendNotificationToUser(backofficeNotifyUser);
  }
  @Post('/send-notification-to-all-users')
  async sendNotificationToUsers(
    @Body() backofficeNotifyUser: BackofficeNotifyAllUser,
  ) {
    return await this.usersService.sendNotificationToAllUser(backofficeNotifyUser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Post('/fetchUserCa')
  async fetchUserCa(@GetUser() user: UserToken) {
    return await this.usersService.fetchUserCa(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Roles(privilege.CLIENT)
  @Get('user-by-referrel-lead-link')
  async userReferrel(
    @GetUser() user: UserToken,
    @Query('idPro') idPro: string,
  ) {
    return await this.usersService.userReferrelService(idPro);
  }

  @Get('/getAllUsersIdWithoutAdmins')
  async getAllUsersIdWithoutAdmins() {
    return await this.usersService.getAllUsersIdWithoutAdmins();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('next-coming-soon')
  async comminSoon(@GetUser() user: UserToken) {
    return await this.usersService.comminSoonService(user._id, user.role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/fetchProSub')
  async fetchProSub(@Query('proId') proId: string, @GetUser() user: UserToken) {
    return await this.usersService.fetchProSub(user, proId);
  }

  @Get('/getAllUsersEmailsWithoutAdmins')
  async getAllUsersEmailsWithoutAdmins() {
    return await this.usersService.getAllUsersEmailsWithoutAdmins();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('/decideLeadShare')
  async decideLeadShare(
    @GetUser() user: UserToken,
    @Query('accept') accept: boolean,
    @Query('notificationId') notificationId: string,
  ) {
    return await this.usersService.decideLeadShare(
      user,
      accept,
      notificationId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/deleteAccount')
  async deleteAccount(@GetUser() user: UserToken) {
    return await this.usersService.deleteAccount(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/set-device-token')
  async settingDeviceToken(@GetUser() me, @Body() tokenData: setTokenDto) {
    return await this.usersService.settingDeviceTokenService(me._id, tokenData);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/monday-appointments')
  async sendNotificationFriday(@GetUser() user: UserToken
  
  ) {
    return await this.usersService.sendNotificationFridayService(user)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(privilege.ADMIN)
  @Get('/deleteAccount-bo')
  async deleteAccountBO(@GetUser() user: UserToken ,@Query('id') id:string) {
    return await this.usersService.deleteAccountBackOffice(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/get-UserLocale')
  async getUserLocale(@GetUser() user: UserToken) {
    return await this.usersService.getUserLocaleService(user);
  }



  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/set-UserLocale')
  async setUserLocale(@GetUser() user: UserToken ,@Body() locale: localUserDto) {
    return await this.usersService.setUserLocaleService(user,locale);
  }

  userLocale



}


//todo test
