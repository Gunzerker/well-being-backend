/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';

@ApiTags('Campany-ressource')
@Controller('company')
export class CompanyController {
  constructor(private campanyService: CompanyService) {}
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'page_size', type: Number, required: true })
  @ApiQuery({ name: 'page_number', type: Number, required: true })
  @Post('test-isNear')
  async isNear(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
  ) {
    //   const result = await this.campanyService.isNear(longitude, latitude);
    //   return {
    //     statusCode: 200,
    //     message: 'API.CATEGORYS_FETCHED',
    //     data: result,
    //     page_number,
    //     page_size,
    //     total_attributs: result.length,
    //   };
  }
  @Get('/internal-endpoint')
  async update(){
    await this.campanyService.updateCompanyVisibility()
  }
}
