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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SUCCEEDED } from 'src/constantes/constantes';
import { GetUser } from 'src/decorators/decotator.user';
import { Roles } from 'src/decorators/privilage.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { privilege, status } from 'src/shared/enums';
import { apiReturner } from 'src/shared/returnerApi';
import { UserToken } from 'src/shared/tokenModel';
import { QuotationService } from './quotation.service';

import { GetQuotationDto } from './dto/quotation-status.dto';
import { User } from '../users/models/user.model';
import { SubscriptionGuardPermission } from 'src/guard/permission.subscription.guard';

@ApiTags('devis-ressources')
@Controller('quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiQuery({ name: 'status', type: String, enum: status, required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.CLIENT)
  @Get('find-quotations-Client')
  async getQuotationClient(
    @GetUser() user: UserToken,
    @Query('toSearch') toSearch: string,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
    @Query('status') status: status,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    const myQuotations = await this.quotationService.getQuotationForClient(
      user._id,
      page_number,
      page_size,
      status,
      toSearch,
    );

    return myQuotations;
  }
  @ApiBearerAuth()
  @ApiParam({ name: 'newStatus', type: String, enum: status })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(privilege.PRO)
  @ApiOperation({
    //summary: '☢️⛔⛔ Do not try this service! ⛔🚫☢️ Back-end only',
    summary: '🚀 New available service! 🚀',
  })
  @Put('update-status-quotation/:idQuo/:newStatus')
  async updateQuotaitonStatus(
    @Param('idQuo') idQuo: string,
    @Param('newStatus') quoStatus: status,
    @GetUser() userPro: UserToken,
  ) {
    const isDone = await this.quotationService.updateQuotationStatus(
      idQuo,
      userPro._id,
      quoStatus,
    );
    if (isDone) {
      return apiReturner(HttpStatus.CREATED, SUCCEEDED);
    } else {
      throw new HttpException(
        'something went wrong when declining quotaion',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @ApiQuery({ name: 'toSearch', type: String, required: false })
  @ApiOperation({
    //summary: '☢️⛔⛔ Do not try this service! ⛔🚫☢️ Back-end only',
    summary: '🚀 This service is available ! 🚀',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  @Roles(privilege.PRO, privilege.CLIENT)
  @Get('find-quotations-pro')
  async getQuotationV2(
    @GetUser() user: UserToken,
    @Query('toSearch') toSearch: string,
    @Query('page_number') page_number: number,
    @Query('page_size') page_size: number,
  ) {
    console.log(user._id);
    page_size ? (page_size = page_size) : (page_size = 10);

    return await this.quotationService.getQuotationsForPro(
      user._id,
      toSearch,
      page_number,
      page_size,
    );
  }

  @Post('get-all-quotation')
  // with status filter
  getPrestationStatus(@Body() payload: GetQuotationDto) {
    return this.quotationService.getPrestationStatus(payload);
  }

  @Get('quotationComptable')
  @ApiQuery({
    name: 'status',
    type: String,
    enum: ['accepted', 'pending'],
    required: true,
  })
  @ApiQuery({ name: 'page_size', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuardPermission)
  // with status filter
  quotationComptable(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
    @Query('from_date') from_date: Date,
    @Query('to_date') to_date: Date,
    @Query('search') search: string,
    @Query('status') status: string,
    @GetUser() user: User,
  ) {
    page_size ? (page_size = page_size) : (page_size = 10);

    return this.quotationService.quotationComptable(
      user,
      search,
      from_date,
      to_date,
      page_size,
      page_number,
      status,
    );
  }
}
