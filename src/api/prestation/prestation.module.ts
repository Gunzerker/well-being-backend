import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { CompanyModule } from '../companies/company.module';
import { BenefitController } from './prestation.controller';
import { PrestationService } from './prestation.service';

@Module({
  imports: [mongooseModuleConfig, CompanyModule],
  controllers: [BenefitController],
  providers: [PrestationService],
  exports: [PrestationService],
})
export class PrestationModule {}
