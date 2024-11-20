import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { copyFile } from 'fs';
import { Model } from 'mongoose';
import { SOMETHING_WENT_WRONG, SUCCEEDED } from 'src/constantes/constantes';

import { FilterDto, PaginationDto } from 'src/shared/dto/pagination.dto';
import { generateRereferralCode } from 'src/shared/generateReferralCode';
import { apiReturner } from 'src/shared/returnerApi';
import { FilesS3Service } from '../auth/s3.service';

import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto';

import { Category } from './schemas/category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private filesS3Service: FilesS3Service,
  ) {}

  async createFrom(createCategoryDto: CreateCategoryDto, image: string) {
    const categorie = await this.categoryModel.create({
      ...createCategoryDto,
      parentCategory:
        createCategoryDto.parentCategory == ''
          ? null
          : createCategoryDto.parentCategory,
    });
    return categorie;
  }

  async create(createCategoryDto: CreateCategoryDto, image: string) {
    const categorie = await this.categoryModel.create({
      active: true,
      imageUrl: image,
      content: createCategoryDto.content,
      name: createCategoryDto.name,
      parentCategory:
        createCategoryDto.parentCategory == ''
          ? null
          : createCategoryDto.parentCategory,
    });
    return categorie;
  }

  async findAllParentCategorie(paginationDto: PaginationDto) {
    //!amani
    const { page_number, page_size } = paginationDto;
    const result = await this.categoryModel
      .find({ parentCategory: null })
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10);

    const total = await this.categoryModel.count({ parentCategory: null });
    return {
      statusCode: 200,
      message: 'API.CATEGORYS_FETCHED',
      data: result,
      page_number,
      page_size,
      total_attributs: total,
    };
  }
  async findAllParentCategoriev2(paginationDto: PaginationDto) {
    const { page_number, page_size } = paginationDto;
    const result = await this.categoryModel
      .find()
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10);

    const total = await this.categoryModel.count();
    return {
      statusCode: 200,
      message: 'API.CATEGORYS_FETCHED',
      data: result,
      page_number,
      page_size,
      total_attributs: total,
    };
  }

  //!------------------------------------------------------------------
  async getallentety(paginationDto: PaginationDto) {
    const { page_number, page_size } = paginationDto;
    const result = await this.categoryModel
      .find()
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10);
    const total = await this.categoryModel.count();

    return {
      statusCode: 200,
      message: 'API.CATEGORYS_FETCHED_all_entety',
      data: result,
      page_number,
      page_size,
      total_attributs: total,
    };
  }

  async findCategoryGrouped() {
    const result = await this.categoryModel.aggregate([
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentCategory',
          as: 'subCat',
        },
      },

      {
        $match: { parentCategory: null },
      },
      { $sort: { createdAt: 1 } },
    ]);
    return {
      statusCode: 200,
      message: 'API.CATEGORIES_FETCHED',
      data: result,
    };
  }
  async findAll(paginationDto: PaginationDto, filter: FilterDto) {
    //! for taha

    Object.keys(filter).forEach((key) => {
      if (filter[key] === undefined) {
        delete filter[key];
      }
    });

    const { page_number, page_size } = paginationDto;
    if (filter.parentName) {
      const result = await this.categoryModel.aggregate([
        {
          $graphLookup: {
            from: 'categories',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parentCategory',
            as: 'subCat',
          },
        },
        {
          $match: {
            name: { $regex: filter.parentName, $options: 'i' },
          },
        },
        { $sort: { createdAt: 1 } },
      ]);

      Object.keys(filter).forEach((key) => {
        if (filter.parentName) {
          delete filter.parentName;
        }
      });
      if (result[0].subCat) {
        result[0].subCat.map((data: any) => {
          data['parentCatName'] = result[0].name;
        });
      }

      if (result.length >= 1) {
        if (filter.name != null && filter.active != null) {
          const filtred = result[0].subCat.filter((data: Category) => {
            if (data.name != null) {
              return (
                (data.name == filter.name || data.name != null
                  ? data.name.toString().includes(filter.name)
                  : false) && String(data.active) == String(filter.active)
              );
            } else if (data.name == null) {
              return false;
            }
          });
          const filtredAndSordfiltred = filtred.sort(
            (a: Category, b: Category) => {
              return (
                Date.parse(String(b.createdAt)) -
                Date.parse(String(a.createdAt))
              );
            },
          );

          return {
            statusCode: 200,
            message: 'API.CATEGORYS_FETCHED',
            data: filtredAndSordfiltred.slice(
              (page_number - 1) * page_size,
              page_number * page_size,
            ),
            page_number,
            page_size,
            parent_name: result[0],
            total_attributs: filtredAndSordfiltred.length,
          };
        } else {
          const val = Object.keys(filter);

          const reg = new RegExp(`${filter.name}`, 'i');

          const filtred = result[0].subCat.filter((data: any) => {
            return (
              String(data[val[0]]) == String(filter[Object.keys(filter)[0]]) ||
              reg.test(data.name)
            );
          });

          const filtredAndSort = filtred.sort((a: Category, b: Category) => {
            return (
              Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt))
            );
          });
          console.log(filtredAndSort);

          return {
            statusCode: 200,
            message: 'API.CATEGORYS_FETCHED',
            data: filtredAndSort
              .slice((page_number - 1) * page_size, page_number * page_size)
              .sort(),
            page_number,
            page_size,
            parent_name: { ...result[0], subCat: null },
            total_attributs: filtredAndSort.length,
          };
        }
      } else {
        return {
          statusCode: 200,
          message: 'API.CATEGORYS_FETCHED',
          data: result
            .slice((page_number - 1) * page_size, page_number * page_size)
            .sort(),
          page_number,
          page_size,
          parent_name: { ...result[0], subCat: null },
          total_attributs: result.length,
        };
      }
    } else if (!filter.parentName) {
      if (filter.name) {
        const result = await this.categoryModel
          .find({
            ...filter,
            name: { $regex: new RegExp(`${filter.name}`), $options: 'i' },
          })
          .populate('parentCategory')
          .sort({ createdAt: -1 });

        const total = result.length;

        return {
          statusCode: 200,
          message: 'API.CATEGORYS_FETCHED',
          data: result.slice(
            (page_number - 1) * page_size,
            page_number * page_size,
          ),
          page_number,
          page_size,
          total_attributs: total,
        };
      } else {
        const result = await this.categoryModel
          .find({ ...filter })
          .populate('parentCategory')
          .sort({ createdAt: -1 });
        const total = result.length;
        return {
          statusCode: 200,
          message: 'API.CATEGORYS_FETCHED',
          data: result.slice(
            (page_number - 1) * page_size,
            page_number * page_size,
          ),
          page_number,
          page_size,
          total_attributs: total,
        };
      }
    }

    /* find the total */
  }

  async findOne(_id: string, paginationDto: PaginationDto) {
    const { page_number, page_size } = paginationDto;
    const { name,content } = await this.categoryModel.findOne({ _id });
    const result = await this.categoryModel
      .find({ parentCategory: _id, active: true })
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10);

    const total = await this.categoryModel.count({ parentCategory: _id });

    return {
      statusCode: 200,
      message: 'API.CATEGORYS_FETCHED',
      name,
      content:content,
      data: result,
      page_number,
      page_size,
      total_attributs: total,
    };
  }

  async getAllDeactivateSubCatService() {
    return await this.categoryModel.find({ active: false });
  }

  async updateCatService(_id: string, newData: UpdateCategoryDto, file?: any) {
    if (file) {
      const exist = await this.categoryModel.findOne({
        _id: _id,
      });
      if (exist && exist.parentCategory == null) {
        const fileName =
          generateRereferralCode(12) + '.' + _id + '.' + Date.now() + '.jpg';
        const { Location } = await this.filesS3Service.uploadFile(
          file.buffer,
          fileName,
        );

        const newimageUrl = Location.split('com/')[1];
        if (newData.parentCategory) {
          const existParent = await this.categoryModel.findOne({
            _id: _id,
          });
          if (existParent) {
            const res = await this.categoryModel.findOneAndUpdate(
              { _id },
              { imageUrl: newimageUrl, ...newData },
              { new: false, upsert: false },
            );
            return res
              ? apiReturner(HttpStatus.CREATED, SUCCEEDED)
              : apiReturner(HttpStatus.CREATED, SOMETHING_WENT_WRONG);
          } else {
            console.log('type_mistatch : this parent category does not exist ');
            throw new HttpException(
              'type_mistatch : this parent category does not exist ',

              HttpStatus.BAD_REQUEST,
            );
          }
        } else {
          const res = await this.categoryModel.findOneAndUpdate(
            { _id },
            { imageUrl: newimageUrl, ...newData },
            { new: false, upsert: false },
          );
          return res
            ? apiReturner(HttpStatus.CREATED, SUCCEEDED)
            : apiReturner(HttpStatus.CREATED, SOMETHING_WENT_WRONG);
        }
      } else {
        console.log(
          'type_mistatch : Maybe you trying to add an image to a sub category  ',
        );
        throw new HttpException(
          'type_mistatch : Maybe you are trying to add an image to a sub category ',

          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      if (newData.parentCategory) {
        const exist = await this.categoryModel.findOne({
          _id: newData.parentCategory,
        });
        if (exist) {
          const res = await this.categoryModel.findOneAndUpdate(
            { _id },
            { ...newData },
            { new: false, upsert: false },
          );
          if (res) {
            return apiReturner(HttpStatus.CREATED, SUCCEEDED);
          } else {
            throw new HttpException(
              SOMETHING_WENT_WRONG,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
        } else {
          console.log('type_mistatch : this parent category does not exist ');
          throw new HttpException(
            'type_mistatch : this parent category does not exist ',

            HttpStatus.BAD_REQUEST,
          );
        }
      }
      {
        const res = await this.categoryModel.findOneAndUpdate(
          { _id },
          { ...newData },
          { new: false, upsert: false },
        );
        return res
          ? apiReturner(HttpStatus.CREATED, SUCCEEDED)
          : apiReturner(HttpStatus.CREATED, SOMETHING_WENT_WRONG);
      }
    }
  }

  async removeService(_id: string) {
    return await this.categoryModel.remove({ _id });
  }

  async isParent(catId: string) {
    try {
      const isParent = await this.categoryModel.findOne({
        _id: catId,
        parentCategory: null,
      });
      return isParent ? true : false;
    } catch (e) {
      throw new Error('Invalid id');
    }
  }
}
