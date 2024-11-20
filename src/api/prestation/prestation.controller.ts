import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/decorators/decotator.user';
import { Roles } from 'src/decorators/privilage.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { privilege } from 'src/shared/enums';
import { UserToken } from 'src/shared/tokenModel';

import { PrestationService } from './prestation.service';
@ApiTags('prestation-ressources')
@Controller('prestation')
export class BenefitController {
  constructor(private readonly presServ: PrestationService) {}

  // @Get()
  // findAll() {
  //   return this.benefitService.findAll();
  // }

  // @Get('all')
  // async all() {
  //   return await this.presServ.all();
  // }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  async remove(@Param('id') id: string, @GetUser() user: UserToken) {
    return await this.presServ.remove(id, user._id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(privilege.PRO)
  async fetchCompanyPrestation(
    @Query('companyId') companyId: string,
    @GetUser() user: UserToken,
  ) {
    return await this.presServ.fetchCompanyPrestation(companyId, user._id);
  }
}
