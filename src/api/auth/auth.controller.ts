import { AuthService } from './auth.service';
import {
  EmailVerifDto,
  referralCodeSenderDto,
  RegisterUserDto,
} from './dto/createUserDto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SignInUserDto } from './dto/signIn.tdo';
import { ForgetPasswordDto } from './dto/forgetUserDto';
import { ResetPasswordDto } from './dto/resetPassDto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReferralCodePipe } from 'src/pipes/raferralCode';
import { GetUser } from 'src/decorators/decotator.user';
import { JwtAuthGuard } from '../../guard/jwt-auth.guard';
import { privilege, uPhotos } from 'src/shared/enums';
import { Roles } from 'src/decorators/privilage.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';

import { CreatePrestationDto } from '../prestation/prestation.dto';
import { LevelElevenDto } from '../auth/dto/eleven.level.dto';
import { LevelSevenDto } from '../auth/dto/seven.level.Dto';

import { LevelEightDto } from './dto/levelEightDto';
import { User } from '../users/models/user.model';
import {
  LevelTwelveDto,
  UpdatePhotosDto,
  UpdatePhotosTeamDto,
} from './dto/twelve.level.Dto';
import { LevelFiveDto, updateTeamDto, updateTeamWebDto } from './dto/five.level.Dto';

import { OneLevelDto, ThreeLevelDto, TowLevelDto } from './dto/one.level.dto';
import { UserToken } from 'src/shared/tokenModel';
import { RolesGuard } from 'src/guard/roles.guard';
import { Device } from 'src/decorators/decotator.device.check';
import { Query } from '@nestjs/common/decorators';
import { SubscriptionGuardPermission } from 'src/guard/permission.subscription.guard';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) { }

  @UsePipes(ValidationPipe)
  // EMAIL_PASS_INVALID
  @ApiResponse({ status: 403, description: 'EMAIL_PASS_INVALID' })
  @ApiResponse({ status: 406, description: 'PAYMENT_REQUIRED' })
  @ApiResponse({ status: 201, description: 'Sign in process was valid ' })
  @ApiResponse({
    status: 402,
    description: 'the user need to activate his account via email',
  })
  @ApiResponse({
    status: 500,
    description: 'something else went wrong',
  })
  @Post('signin')
  async loginController(@Body() user: SignInUserDto) {
    if (!user.platform) user.platform = null
    if (!user.email || !user.password) {
      throw new HttpException('Invalid user Data', HttpStatus.BAD_REQUEST);
    } else {
      return await this.authService.validateUser(user);
    }
  }

  @UsePipes(ValidationPipe, ReferralCodePipe)
  @ApiResponse({ status: 201, description: 'Sign up process was valid ' })
  @ApiResponse({
    status: 500,
    description:
      'Some credentials are wrongs : INVALID_SIRET_CODE, EMAIL_DID_NOT_SEND',
  })
  @ApiResponse({
    status: 409,
    description: ' Conflict error : Some credentials already used ',
  })
  @Post('signup')
  async registerUser(@Body() userData: RegisterUserDto) {
    return await this.authService.registerUserService(userData);
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @ApiOperation({ summary: '⚠️ 🚧 Backend-purposes 🚧 ⚠️' })
  @Post('where-do-you-came-from')
  // async comeFrom(@Device() device: string) {
  //   console.log(device);
  //   return device;
  // }
  //!--------------------------------------------------------
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiBearerAuth()
  @Post('resend-email')
  async resendEmail(@GetUser() user: User) {
    return await this.authService.resendEmailService(user);
  }
  @Delete('deleteMe/:email')
  async deleteMe(@Param('email') email: string) {
    return await this.authService.deleteUserService(email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('account-verified/')
  async verifiedAccount(@GetUser() user: UserToken) {
    return await this.authService.verifiedAccountService(user._id);
  }

  @UsePipes(ValidationPipe)
  @Post('forget-password')
  async forgetPassword(@Body() forgetPasswordDto: ForgetPasswordDto) {
    return await this.authService.forgetPasswordService(forgetPasswordDto);
  }

  @UsePipes(ValidationPipe)
  @Put('reset-password/:token')
  async resetPassword(
    @Body() newPassword: ResetPasswordDto,
    @Param('token') token: string,
  ) {
    return this.authService.updatePasswordService(token, newPassword);
  }
  //? profile configuration
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @Get('get-level')
  @ApiBearerAuth()
  async getConfigurationlevel(level: number, @GetUser() user: UserToken) {
    return await this.authService.getLevelService(user);
  }
  @Post('level')
  @ApiBearerAuth()
  async addingConfigurationlevel(@Body() configurationLevel) {
    return await this.authService.updateStep(
      configurationLevel.email,
      configurationLevel.number,
    );
  }

  @Post('signup-config/level-1-company-informations-v2')
  @Roles(privilege.PRO)
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆*  ' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async addingConfigurationlevelOneV2(
    @Body() attributes: OneLevelDto,
    @GetUser() user: UserToken,
  ) {
    return await this.authService.addingLevelServiceOnev2(user, attributes);
  }
  //
  //
  //
  //
  //
  //
  //

  //!------------------Configuration Profile screen 1

  @Post('signup-config/level-1-company-informations')
  @ApiOperation({ deprecated: true })
  @Roles(privilege.PRO)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async addingConfigurationlevelOne(
    @Body() attributes: OneLevelDto,
    @GetUser() user: UserToken,
  ) {
    return await this.authService.addingLevelServiceOne(user, attributes);
  }

  //todo backend-purposes
  @Post('test33')
  async test(@Body() attributes: OneLevelDto) {
    let exsite = 0;
    let other = 0;
    let table = [];
    for (let i = 0; i < attributes.categories.length; i++) {
      if (table.length < 2) {
        if (attributes.categories[i]?.cat_id) {
          console.log('exsite');
          table.push(attributes.categories[i]);
        } else {
          table.push(attributes.categories[i]);
        }
      }
    }
    exsite = table.filter((data) => data.cat_id).length;
    other = table.filter((data) => !data.cat_id).length;
    console.log(exsite);
    if (exsite == 1 && other == 1) {
      return table;
    }
    if (exsite == 2) {
      return table;
    }
    if (exsite == 1) {
      return table;
    }
    return { msg: 'you need at leats added an existing sub categories' };
  }
  //!------------------Configuration Profile screen 2

  //!

  //!

  @ApiConsumes('multipart/form-data')
  @Post('signup-config/level-2-company-informations-2')
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @ApiBody({
    description: 'images',
    type: TowLevelDto,
  })
  async addingConfigurationlevelTow(
    @UploadedFile()
    file,
    @GetUser() user: UserToken,
    @Body() payload: TowLevelDto,
  ) {
    if (!file) {
      return this.authService.addAvatar(user._id, null, payload, null);
    } else {
      const fileName = file.originalname + '.jpg';
      return this.authService.addAvatar(
        user._id,
        fileName,
        payload,
        file.buffer,
      );
    }
  }

  //!  //!------------------Configuration Profile screen 3

  @Post('signup-config/level-3-location')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '⚠️⚠️⚠️  Note that longitude comes first in a GeoJSON coordinate array, : coordinates:[ longitude , latitude ] ⚠️⚠️⚠️',
  })
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async addingConfigurationlevelThree(
    @Body() data: ThreeLevelDto,
    @GetUser() user: UserToken,
  ) {
    return this.authService.addingLevelServiceThree(user, data);
  }

  //!  //!------------------Configuration Profile screen 4

  @Post('signup-config/level-4-prices-list')
  @Roles(privilege.PRO)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async addingConfigurationlevelFour(
    @Body() createPrestationDto: CreatePrestationDto,
    @GetUser() user,
  ) {
    return await this.authService.addingLevelServiceFour(
      user,
      createPrestationDto,
    );
  }

  @Post('signup-config/level-7-degrees')
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @ApiBearerAuth()
  async addingConfigurationlevelSeven(
    @Body() createLevelSeven: LevelSevenDto,
    @GetUser() user,
  ) {
    return await this.authService.addingLevelServiceSeven(
      user,
      createLevelSeven,
    );
  }
  //!  //!------------------Configuration Profile screen 9

  @Get('signup-config/level-9-stripe-connect')
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addingConfigurationlevelNine(@GetUser() user) {
    return await this.authService.addingLevelServiceNine(user);
  }

  @Post('signup-config/level-11-disponibility')
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async addingConfigurationlevelEleven(
    @Body() createlevelEleven: LevelElevenDto,
    @GetUser() user,
  ) {
    console.log("*************");
    console.log(createlevelEleven);
    console.log("*************");




    return await this.authService.addingLevelServiceEleven(
      user,
      createlevelEleven,
    );
  }

  //!  //!------------------Configuration Profile screen 5
  @Post('signup-config/level-5-create-employees')
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'boutique_images' },
      { name: 'portfolio_images' },
      { name: 'employees_images' },
    ]),
  )
  @ApiBody({
    description: `Employees needs to be as the following structer '{"employees":[{"firstName":'',"email":'',"has_image":boolean}]}'`,
    type: LevelFiveDto,
  })
  // '{"employees":[{"firstName":"houssem1_employee","email":"mail@getMaxListeners.com"}]}'
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async addingConfigurationlevelFive(
    @GetUser() userPro,
    @Body() levelFive,
    @UploadedFiles()
    files: {
      boutique_images?: Express.Multer.File[];
      portfolio_images?: Express.Multer.File[];
      employees_images?: Express.Multer.File[];
    },
  ) {
    let parsed_employees: any;
    if (levelFive.Employees) {
      parsed_employees = JSON.parse(levelFive.Employees);
      parsed_employees = parsed_employees.employees;
    }
    levelFive.show_public_employees = true
    return await this.authService.addingLevelServiceFive(
      parsed_employees,
      files.employees_images,
      files.boutique_images,
      files.portfolio_images,
      levelFive.show_public_employees,
      userPro,
    );
  }
  //!------------------Configuration Profile screen 10
  @Post('signup-config/level-10-referral-code-sender')
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  async addingConfigurationlevelTen(
    @GetUser() userPro: User,
    @Body() emails: referralCodeSenderDto,
  ) {
    return await this.authService.addingLevelServiceTen(userPro, emails);
  }
  //!--------
  @ApiResponse({
    status: 409,
    description: 'Email existe and resutl should be like : {"valid":false}',
  })
  @ApiResponse({
    status: 200,
    description:
      'Email does not existe and resutl should be like : {"valid":true}',
  })
  @Post('signup-config/level-10-verif-email')
  //@ApiBearerAuth()
  //@Roles(privilege.PRO)
  //@UseGuards(JwtAuthGuard, RolesGuard)
  async verifEmail(
    //@GetUser() userPro: User,
    @Body() emailToVerif: EmailVerifDto,
  ) {
    return await this.authService.verifEmail(emailToVerif);
  }

  //!------------------Configuration Profile screen 8
  @Post('signup-config/level-8-social-media-link')
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  addingConfigurationlevelEight(
    @GetUser() user: User,
    @Body() data: LevelEightDto,
  ) {
    return this.authService.addingConfigurationlevelEightService(user, data);
  }

  //!------------------Configuration Profile screen 12
  @Post('signup-config/level-12-cover')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiBody({
    description: 'images',
    type: LevelTwelveDto,
  })
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  public async uploadMultipleFiles(
    @GetUser() user,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return await this.authService.addingLevelServiceTwelve(user, files);
  }

  @Get('signup-config/level-12-recap')
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard)
  levelTwelveRecap(@GetUser() user: User, @Device() device: string) {
    return this.authService.levelTwelveRecapService(user, device);
  }

  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '⚠️' })
  @Post('update-boutique-photos')
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @UseInterceptors(FilesInterceptor('photos'))
  @ApiBearerAuth()
  @ApiBody({
    description: 'photos',
    type: UpdatePhotosDto,
  })
  async updateBoutiquePhotos(
    @UploadedFiles() photos,
    @GetUser() user: UserToken,
  ) {
    return this.authService.updatePhotoService(user, photos, uPhotos.BOUTIQUE);
  }

  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '⚠️' })
  @Post('update-portfolio-photos')
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @UseInterceptors(FilesInterceptor('photos'))
  @ApiBearerAuth()
  @ApiBody({
    description: 'photos',
    type: UpdatePhotosDto,
  })
  async updatePortfolioPhotos(
    @UploadedFiles() photos,
    @GetUser() user: UserToken,
  ) {
    return this.authService.updatePhotoService(user, photos, uPhotos.PORTFOILO);
  }

  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '⚠️ 🚧 💀 🚧 ⚠️', deprecated: true })
  @Post('update-team-photos')
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @UseInterceptors(FilesInterceptor('photos'))
  @ApiBearerAuth()
  @ApiBody({
    description: 'photos',
    type: UpdatePhotosTeamDto,
  })
  async updateTeamPhotos(
    @UploadedFiles() photos,
    @Body() payload: UpdatePhotosTeamDto,
    @GetUser() user: UserToken,
  ) {
    console.log(payload);
    // const fakePayload = {
    //   _ids: [
    //     '633d8ee2ca5a7bae98dbb370',
    //     '633d8ee3ca5a7bae98dbb373',
    //     '633d8ee3ca5a7bae98dbb376',
    //   ],
    // };
    var employees_payload: [{ photo: Express.Multer.File; _id: string }] = [
      { photo: null, _id: '' },
    ];
    for (let i = 0; i < photos.length; i++) {
      employees_payload[i] = {
        photo: photos[i],
        _id: payload._ids.toString().split(',')[i],
      };
    }
    console.log(employees_payload);

    return this.authService.updatePhotoService(
      user,
      employees_payload,
      uPhotos.TEAM,
      payload.show_public_employees,
    );
  }
  //!from Walid :✂️- - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - - Sprint4 - - - - - - - -
  @Post('update-team')
  @ApiOperation({ summary: '⚠️' })
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'employees_images' }]))
  @ApiBody({
    description: ` <b stype="color:red">Employees needs to be as the following structer : 
    {"employees":[{"firstName": "hola", "email": "Strihola@gmail.com","has_image":true}]} </b>`,
    type: updateTeamDto,
  })
  async updateTeam(
    @GetUser() userPro,
    @Body() uTeam: updateTeamDto,
    @UploadedFiles()
    files: {
      employees_images?: Express.Multer.File[];
    },
  ) {
    let parsed_employees: any;
    if (uTeam.employees) {
      // const newString = uTeam.employees.substring(
      //   1,
      //   uTeam.employees.length - 1,
      // );
      parsed_employees = JSON.parse(uTeam.employees);
      parsed_employees = parsed_employees.employees;
    }
    console.log(parsed_employees);
    console.log('************************************* Update employees **');
    console.log(
      '*********************************************** Update employees **',
    );
    console.log('string: ', uTeam.employees);
    console.log('user :', userPro);
    console.log('parsed_employees :', parsed_employees);
   
    console.log(uTeam.employees_images);

    console.log('*************************************************');

    return await this.authService.updateTeamService(
      parsed_employees,
      files && files.employees_images ? files.employees_images : null,
      uTeam.show_public_employees,
      userPro
    );
  }

  @ApiResponse({
    status: 200,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  @ApiOperation({ summary: '🚀 𝑵𝒆𝒘 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒔𝒆𝒓𝒗𝒊𝒄𝒆* ' })
  @Post('sign-out')
  async signOut(
    @Query('notificationDeviceToken') notificationDeviceToken: string,
    @GetUser() me: UserToken,
  ) {
    return await this.authService.signOutService(me, notificationDeviceToken);
  }

  @Get('fetchUserByToken')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuardPermission)
  fetchUserByToken(@GetUser() user: UserToken) {
    return this.authService.fetchUserByToken(user);
  }


  @Post('update-team-web')
  @ApiOperation({ summary: '⚠️' })
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'employees_images_web' }]))
  @ApiBody({
    description: ` <b stype="color:red">Employees needs to be as the following structer : 
    {"employees":[{"firstName": "hola", "email": "Strihola@gmail.com","has_image":true}]} </b>`,
    type: updateTeamWebDto,
  })
  async updateTeamWeb(
    @GetUser() userPro,
    @Body() uTeam: updateTeamWebDto,
    @UploadedFiles()
    files: {
      employees_images_web?: Express.Multer.File[];
    },
  ) {
    let parsed_employees: any;
    if (uTeam.employees) {
      // const newString = uTeam.employees.substring(
      //   1,
      //   uTeam.employees.length - 1,
      // );
      parsed_employees = JSON.parse(uTeam.employees);
      parsed_employees = parsed_employees.employees;
    }
    // console.log(parsed_employees);
    // console.log('************************************* Update employees **');
    // console.log(
    //   '*********************************************** Update employees **',
    // );
    // console.log('string: ', uTeam.employees);
    // console.log('user :', userPro);
    // console.log('parsed_employees :', parsed_employees);
    // console.log(uTeam.employees_images_web);
    // console.log('*************************************************');

    return await this.authService.updateTeamServiceWeb(
      parsed_employees,
      uTeam.show_public_employees,
      userPro,
      files.employees_images_web,
  
  );
  }

}
