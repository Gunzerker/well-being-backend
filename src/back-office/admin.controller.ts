/*
https://docs.nestjs.com/controllers#controllers
*/

// import * as fs from 'fs';
// import * as path from 'path';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { bool } from 'sharp';
import {
  DeleteUserDto,
  RegisterUserByAdminDto,
  RegisterUserDto,
} from 'src/api/auth/dto/createUserDto';

import {
  CreateSubscriptionDto,
  TestCreateSubscriptionDto,
  TestUpdateSubscriptionDto,
} from 'src/api/users/dto/createSubscription.Dto';
import { Device } from 'src/decorators/decotator.device.check';

import { Roles } from 'src/decorators/privilage.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { device, privilege } from 'src/shared/enums';

import { AdminService } from './admin.service';
import { UpdateEventPackAdmin } from './dto/event.dto';
import { UpdateSubscriptionBackofficeDto } from './dto/payement.dto';
import { UpdateUserByAdminDto } from './dto/user.dto';

import { Gpp } from './models/gpp2';

@ApiTags('back-office')
//@Roles(privilege.ADMIN)
//@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('back-office')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @Post('create-subscription')
  async createCity(@Body() newSubdata: CreateSubscriptionDto) {
    return await this.adminService.createSubscriptionService(newSubdata);
    //return await this.adminService.testCreateSubscriptionDto(newSubdata);
  }

  //todo test--------------------------------------------------------------------------
  // @Post('create-subscription-test')
  // async createsubscriptionTest(@Body() newSubdata: TestCreateSubscriptionDto) {
  //   return await this.adminService.testCreateSubscriptionDto(newSubdata);
  // }
  // @Get('g-subscription-test/')
  // async getByIdSubtest(@Query('id') _query: any) {
  //   return await this.adminService.testgetAllSubscriptionService(_query);
  // }
  // @Put('u-subscription-test/:id')
  // async testupdateSub(
  //   @Body() newSubdata: TestUpdateSubscriptionDto,
  //   @Param('id') _id: string,
  // ) {
  //   return await this.adminService.testupdateSubscriptionService(
  //     newSubdata,
  //     _id,
  //   );
  // }
  //todo test--------------------------------------------------------------------------
  //!approved
  @Put('u-subscription')
  async updateSub(@Body() newSubdata: any) {
    return await this.adminService.updateSubscriptionService(newSubdata);
  }
  //! to implement
  @Delete('d-subscription/:id')
  async deleteSub(@Param('id') _id: any) {
    return await this.adminService.daleteSubscriptionService(_id);
  }
  //! approved
  @Get('subscription/:id')
  async getByIdSub(@Param('id') _id: any) {
    return await this.adminService.getSubscriptionByIdService(_id);
  }
  //! approved
  @Get('subscriptions')
  async getAllSub(@Query('id') _id: any) {
    return await this.adminService.getAllSubscriptionService(_id);
  }

  @Post('/webhook')
  paymentWebhook(@Body() data) {
    console.log('** Intercepted by Webhook **');
    return this.adminService.priceWebhook(data);
  }

  @Post('gpp')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(privilege.ADMIN)
  @ApiQuery({ name: 'locale', type: String, required: true })
  async addGpp(@Body() data: Gpp,@Query('locale') locale: string) {
    return await this.adminService.createGpp(data,locale);
  }

  @Get('gpp')
  @ApiQuery({ name: 'locale', type: String, required: true })
  async getGpp(@Query('locale') locale: any) {
    return await this.adminService.getGpp(locale);
  }
  @Get('check-server-connexion')
  async checkServerConnexion() {
    return {
      message: HttpStatus.OK
    };
  }
  //!Updating for back-end porposes :D
  //{
  // @Post('gpp')
  // async ptest(
  //   @Body()
  //   data: {
  //     generalConditions: string;
  //     privacyPolicy: string;
  //     paymentRules: string;
  //   },
  // ) {
  //   try {
  //     const dirPath = path.join(process.cwd(), '/src/gPolicy');
  //     console.log(fs.existsSync(dirPath));
  //     if (!fs.existsSync(dirPath)) {
  //       fs.mkdirSync(dirPath);
  //       console.log(fs.existsSync(dirPath));
  //     }

  //     const file = fs.readFileSync(dirPath + '/gpp.json', 'utf-8');
  //     if (!file) {
  //       fs.writeFile(
  //         dirPath + '/gpp.json',
  //         JSON.stringify(data),
  //         function (err) {
  //           if (err) throw err;
  //           console.log('File is created successfully.');
  //         },
  //       );
  //       return apiReturner(HttpStatus.CREATED.toString(), SUCCEEDED);
  //     } else {
  //       const obj = JSON.parse(file);
  //       const newObj = { ...obj, ...data };

  //       fs.writeFile(
  //         dirPath + '/gpp.json',
  //         JSON.stringify(newObj),
  //         function (err) {
  //           if (err) throw err;
  //           console.log('File is created successfully.');
  //         },
  //       );
  //       return apiReturner(HttpStatus.CREATED.toString(), SUCCEEDED);
  //     }

  //     //   } catch (e) {
  //   } catch (e) {
  //     throw new InternalServerErrorException('the file is empty');
  //   }
  // }

  // @Get('gpp')
  // async gettest() {
  //   try {
  //     const dirPath = path.join(process.cwd(), '/src/gPolicy');
  //     console.log(fs.existsSync(dirPath));
  //     if (!fs.existsSync(dirPath)) {
  //       throw new InternalServerErrorException('File_not_Exist');
  //     }

  //     return apiReturner(
  //       HttpStatus.CREATED.toString(),
  //       SUCCEEDED,
  //       JSON.parse(fs.readFileSync(dirPath + '/gpp.json', 'utf-8')),
  //     );
  //   } catch (e) {
  //     throw new InternalServerErrorException(e);
  //   }
  // }

  //
  //}
  @ApiResponse({
    status: 500,
    description: '<b>You dont have permission to use this API<b> ',
  })
  @ApiResponse({
    status: 401,
    description: '<b>Token not valid<b>',
  })
  @ApiResponse({
    status: 400,
    description: '<b>Users not exist or the role not valid<b> ',
  })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: true })
  @ApiQuery({ name: 'role', type: String, required: false })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiQuery({
    name: 'addedByAdmin',
    type: Boolean,
    required: false,
    description: 'true means all users , false means only simple pro',
  })
  @ApiBearerAuth()
  @Roles(privilege.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('all-users')
  getUsersByRole(
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('role') role: string,
    @Query('toSearch') toSearch: string,
    @Query('addedByAdmin') addedByAdmin: any,
  ) {
    if (addedByAdmin.toString() == 'true') {
      addedByAdmin = null;
    } else {
      addedByAdmin = addedByAdmin;
    }
    if (role && toSearch) {
      return this.adminService.getAllUserByRole(
        addedByAdmin,
        page_number,
        page_size,
        {
          role: role.toUpperCase(),
          toSearch,
        },
      );
    } else if (role) {
      return this.adminService.getAllUserByRole(
        addedByAdmin,
        page_number,
        page_size,
        {
          role,
        },
      );
    } else if (toSearch) {
      return this.adminService.getAllUserByRole(
        addedByAdmin,
        page_number,
        page_size,
        {
          toSearch,
        },
      );
    } else {
      return this.adminService.getAllUserByRole(
        addedByAdmin,
        page_number,
        page_size,
      );
    }
  }
  //! -----------------------------------------------------create Pro Users
  @ApiResponse({
    status: 500,
    description: '<b>You dont have permission to use this API<b> ',
  })
  @ApiResponse({
    status: 401,
    description: '<b>Token not valid<b>',
  })
  @ApiResponse({
    status: 400,
    description: ' ',
  })
  // @ApiBearerAuth()
  // @Roles(privilege.ADMIN)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('new-pro')
  createProUser(@Body() newUserPro: RegisterUserByAdminDto) {
    return this.adminService.createProService(newUserPro);
  }

  @Put('update-event-pack')
  updateEventPackAdmin(@Body() payload: UpdateEventPackAdmin) {
    return this.adminService.updateEventPack(payload);
  }

  @Post('all-event-pack')
  fetchAllEventPack(@Body() payload: UpdateEventPackAdmin) {
    return this.adminService.fetchAllEventPack(payload);
  }

  @Delete('delete-event-pack')
  deleteEventPack(@Body() payload: UpdateEventPackAdmin) {
    return this.adminService.deleteEventPack(payload);
  }

  @Put('update-users-backoffice')
  updateUser(@Body() payload: UpdateUserByAdminDto) {
    return this.adminService.updateUserByAdmin(payload);
  }

  @Get('list-prices')
  listPrices() {
    return this.adminService.listPrices();
  }

  @Post('create-price')
  createPriceStripe() {
    return this.adminService.createPriceStripe();
  }

  @Post('retreive-price')
  retrievePrice() {
    return this.adminService.retrievePrice();
  }

  @Post('create-product')
  createProduct() {
    return this.adminService.createProduct();
  }

  @Post('update-price-activation')
  updatePriceActivation() {
    return this.adminService.updatePriceActivation();
  }

  @Post('update-subscription-price')
  updateSubscriptionPrice(@Body() payload: UpdateSubscriptionBackofficeDto) {
    return this.adminService.updateSubscriptionPrice(payload);
  }
  @Post('delete-backoffice-pro')
  deleteBackofficePro(@Body() deleteUserDto: DeleteUserDto) {
    return this.adminService.deleteBackofficePro(deleteUserDto);
  }


  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: true })
  @ApiQuery({ name: 'role', type: String, required: false })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiBearerAuth()
  @Roles(privilege.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('getOnlyAnnuaire')
  async getOnlyAnnuaire(
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('toSearch') toSearch: string,
  ) {
    return await  this.adminService.getOnlyAnnuaireService(
     page_number,
     page_size,
    toSearch,
    );
  }
}
