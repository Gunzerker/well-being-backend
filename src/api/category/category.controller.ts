import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Put,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto';

import { PaginationDto } from '../../shared/dto/pagination.dto';
import { Roles } from 'src/decorators/privilage.decorator';
import { privilege } from 'src/shared/enums';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserToken } from 'src/shared/tokenModel';
import { GetUser } from 'src/decorators/decotator.user';
import { generateRereferralCode } from 'src/shared/generateReferralCode';
import { FilesS3Service } from '../auth/s3.service';

@ApiTags('category-ressource')
@Controller('category')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private filesS3Service: FilesS3Service,
  ) {}
  @ApiConsumes('multipart/form-data')
  @Post('create')
  @ApiBearerAuth()
  @Roles(privilege.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBody({
    description: 'images',
    type: CreateCategoryDto,
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file,
    @GetUser() user: UserToken,
  ) {
    const fileName =
      generateRereferralCode(12) + '.' + user._id + '.' + Date.now() + '.jpg';
    const { Location } = await this.filesS3Service.uploadFile(
      file.buffer,
      fileName,
    );
    const mageUrl = Location.split('com/')[1];
    return await this.categoryService.create(createCategoryDto, mageUrl);
  }

  @Get('all-categories-grouped')
  findCategoryGrouped() {
    return this.categoryService.findCategoryGrouped();
  }

  @Post('all-categorie-details')
  //! for taha
  @ApiQuery({ name: 'name', type: String, required: false })
  @ApiQuery({ name: 'parentName', type: String, required: false })
  @ApiQuery({ name: 'active', type: Boolean, required: false })
  async findAllv2(
    @Body() paginationDto: PaginationDto,
    @Query('name') name?: string | null,
    @Query('parentName') parentName?: string | null,
    @Query('active') active?: boolean | null,
  ) {
    return await this.categoryService.findAll(paginationDto, {
      name,
      parentName,
      active,
    });
  }

  @Post('all-parent-categorie')
  findAllParentCategoriev2(@Body() paginationDto: PaginationDto) {
    return this.categoryService.findAllParentCategoriev2(paginationDto);
  }

  @Post(':id')
  async findOnev2(
    @Param('id') id: string,
    @Body() paginationDto: PaginationDto,
  ) {
    return await this.categoryService.findOne(id, paginationDto);
  }

  //!----------------------------------------------------------------------
  // @Get('all-categorie-details')
  // async findAll(
  //   @Query('page_size') page_size: number,
  //   @Query('page_number') page_number: number,
  // ) {
  //   //  findAll(@Query() paginationDto: PaginationDto) {
  //   return await this.categoryService.findAllParentCategorie({
  //     page_size,
  //     page_number,
  //   });
  // }

  @Get('all-parent-categorie')
  //!amani
  findAllParentCategorie(
    @Query('page_size') page_size: number,
    @Query('page_number') page_number: number,
  ) {
    return this.categoryService.findAllParentCategorie({
      page_size,
      page_number,
    });
  }

  @Get(':id')
  @ApiQuery({ name: 'page_size', type: Number, required: false })
  async findOne(
    @Param('id') id: string,
    @Query('page_size')
    page_size: number,
    @Query('page_number') page_number: number,
  ) {
    page_size ? page_size : 10;

    return await this.categoryService.findOne(id, {
      page_size,
      page_number,
    });
  }

  @Get('deactive-categories/:id')
  async getAllDeactivateSubCat() {
    return await this.categoryService.getAllDeactivateSubCatService();
  }

  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'update succeeded ' })
  @ApiResponse({
    status: 400,
    description:
      'type_mistatch : maybe you are trying to add an image to a sub category ',
  })
  @ApiResponse({ status: 404, description: 'Wrong URL ' })
  @Roles(privilege.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBody({
    description: 'images',
    type: UpdateCategoryDto,
  })
  @Put(':id')
  async update(
    @Param('id') _id: string,
    @Body() updateCategoryDto: any,
    @UploadedFile() file,
  ) {
    Object.keys(updateCategoryDto).forEach((key) => {
      if (updateCategoryDto[key] === '') delete updateCategoryDto[key];
    });

    return await this.categoryService.updateCatService(
      _id,
      updateCategoryDto,
      file,
    );
  }
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.categoryService.removeService(id);
  }
}
