/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateFavouriteDto } from './dto/create.favourite.dto';
import { Favourite } from './models/favourite.model';

@Injectable()
export class FavouriteService {
  constructor(
    @InjectModel(Favourite.name) private favModel: Model<Favourite>,
  ) {}
  async createFavourite(data: CreateFavouriteDto) {
    return await this.favModel.create({ ...data });
  }
  async removeFavourite(idfav: string) {
    return await this.favModel.deleteOne({ _id: idfav });
  }

  async getFavouriteById(idfav: string) {
    const fav = await this.favModel.findOne({ _id: idfav });
    return fav;
  }

  async getFavouritesByClient(_idUser: string) {
    const fav = await this.favModel.find({ fromClient: _idUser }).populate('toPro');
    console.log("favfavfavfav",fav);
    
  //  const  filtredLost =fav.filter(dataFav => {
  //     return new Date(dataFav.toPro["subscription_start_date"]) < new Date()
  //   })
  //  return filtredLost
    return fav
  }

  async getFavouritesByClientToPro(_idClient: string, _idPro: string) {
    const fav =
    
     await this.favModel
    .findOne({ fromClient: _idClient, toPro: _idPro })
    .populate('toPro');
    // if (fav.toPro["subscription_start_date"] < new Date()) {
    //    return fav;
    // } else {
    //   return null;
    //  }
    console.log("favfavfavfav",fav);
    return fav
    
  }
  async getFavouriteByIdClient(
    idClient: string,
    page_number: number,
    page_size: number,
    toSearch: string,
  ) {
    console.log(toSearch);
    if (!toSearch)
    {
      toSearch=""
  }
    console.log(toSearch);
    
      const favs = await this.favModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'toPro',
            foreignField: '_id',
            as: 'toPro',
          },
        },
        {
          $unwind: {
            path: '$toPro',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'toPro.relatedCompany',
            foreignField: '_id',
            as: 'toPro.relatedCompany',
          },
        },
        {
          $unwind: {
            path: '$toPro.relatedCompany',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'toPro.relatedCompany.categories',
            foreignField: '_id',
            as: 'toPro.relatedCompany.categories',
          },
        },
        {
          $lookup: {
            from: 'prestations',
            localField: 'toPro.relatedCompany.prestations',
            foreignField: '_id',
            as: 'toPro.relatedCompany.prestations',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'toPro.relatedCompany.employees',
            foreignField: '_id',
            as: 'toPro.relatedCompany.employees',
          },
        },
        {
          $match: {
            $and: [
              { fromClient: new mongoose.Types.ObjectId(idClient) },
            
              {
                $or: [
                  { "toPro.subscription_expiration_date": { $gt: new Date() } },
                  { "toPro.total_appointments": { $lt: 3 }},
              ]},
              {
                $or: [
                
                  {
                    'toPro.relatedCompany.companyName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'toPro.relatedCompany.description': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'toPro.firstName:': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'toPro.lastName:': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'toPro.email:': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },

        {
          $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
        },
        { $limit: page_number && page_size ? +page_size : 10 },
        { $sort: { firstName: 1 } },
      ]);

      const favslenth = (
        await this.favModel.aggregate([
          {
            $lookup: {
              from: 'users',
              localField: 'toPro',
              foreignField: '_id',
              as: 'toPro',
            },
          },

          {
            $lookup: {
              from: 'companies',
              localField: 'toPro.relatedCompany',
              foreignField: '_id',
              as: 'toPro.relatedCompany',
            },
          },
          {
            $unwind: {
              path: '$toPro.relatedCompany',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'prestations',
              localField: 'toPro.relatedCompany.prestations',
              foreignField: '_id',
              as: 'toPro.relatedCompany.prestations',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'toPro.relatedCompany.employees',
              foreignField: '_id',
              as: 'toPro.relatedCompany.employees',
            },
          },
          {
            $match: {
              $and: [
                { fromClient: new mongoose.Types.ObjectId(idClient) },
                {
                  $or: [
                    { "toPro.subscription_expiration_date": { $gt: new Date() } },
                    { "toPro.total_appointments": { $lt: 3 }},
                ]},
                {
                  $or: [
                   
                    {
                      'toPro.relatedCompany.companyName': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'toPro.relatedCompany.description': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'toPro.firstName:': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'toPro.lastName:': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                    {
                      'toPro.email:': {
                        $regex: new RegExp(`${toSearch}`),
                        $options: 'i',
                      },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { firstName: 1 } },
        ])
      ).length;

      return {
        statusCode: 200,
        message: 'API_result',
        data: {
          favourites: favs,
        },
        total_attributs: favslenth,
      };
   
      // const favs = await this.favModel
      //   .find({ fromClient: idClient })
      //   .populate({
      //     path: 'toPro',
      //     populate: {
      //       path: 'relatedCompany',
      //       populate: ['employees', 'prestations', 'categories'],
      //     },
      //   })
      //   .skip(page_number && page_size ? (+page_number - 1) * page_size : 0)
      //   .limit(page_number && page_size ? page_size : 10);

      // const favslenth = (await this.favModel.find({ fromClient: idClient }))
      //   .length;
      // return {
      //   statusCode: 200,
      //   message: 'API_result',
      //   data: {
      //     favourites: favs,
      //   },
      //   total_attributs: favslenth,
      // };
    //}
  }
}
