/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { FavouriteService } from './favourite.service';

@Module({
  imports: [mongooseModuleConfig],
  controllers: [],
  providers: [FavouriteService],
  exports: [FavouriteService],
})
export class FavouriteModule {}
