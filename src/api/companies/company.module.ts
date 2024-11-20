import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';

import { mongooseModuleConfig } from 'src/shared/mongooseConfig';

@Module({
  imports: [mongooseModuleConfig],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
