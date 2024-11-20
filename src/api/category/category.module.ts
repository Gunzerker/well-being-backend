import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { mongooseModuleConfig } from 'src/shared/mongooseConfig';
import { FilesS3Service } from '../auth/s3.service';

@Module({
  imports: [mongooseModuleConfig],
  controllers: [CategoryController],
  providers: [CategoryService, FilesS3Service],
  exports: [CategoryService],
})
export class CategoryModule {}
