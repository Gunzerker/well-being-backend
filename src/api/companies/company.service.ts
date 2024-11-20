/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import {
  SOMETHING_WENT_WRONG,
  SUBSCRIPTION_CHECK_FROM_COMPANY,
  SUBSECRIPTION_PAYMENT_CONDITION_FROM_COMPANY,
} from 'src/constantes/constantes';

import { Company } from './company.models';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<Company>,
  ) {}

  async createCompany(newCompany: any) {
    const newCompanyadded = await this.companyModel.create({
      ...newCompany,
      categories: newCompany.categories,
    });

    return newCompanyadded;
  }

  async createWithUpsertCompany(userId, newCompany) {
    const createdCompany = await this.companyModel.findOneAndUpdate(
      { reletedTo: userId },
      { ...newCompany, categories: newCompany.categories },
      { upsert: true, new: true },
    );

    return createdCompany;
  }

  async updateCompanyForDelete(relatedToUserId: string, attributes: any) {
    console.log(relatedToUserId);
    const company = await this.companyModel.updateOne(
      { reletedTo: relatedToUserId },
      { ...attributes },
    );
    return company;
  }
  async updateCompany(relatedToUserId: string, attributes: any) {
    console.log(attributes);
    // const table = [
    //   attributes.location.coordinates.latitudeattributes.location.coordinates
    //     .longitude,
    // ];
    const company = await this.companyModel.findOneAndUpdate(
      { reletedTo: relatedToUserId },
      { ...attributes },
      { new: true, upsert: true },
    );

    return company;
  }
  async updateCompanybyId(_id: string, attributes: any) {
    console.log(attributes, _id);
    const company = await this.companyModel.updateOne(
      { _id },
      { ...attributes },
    );

    return company;
  }

  async getCompanyByUserId(userId: string) {
    const company = await this.companyModel
      .findOne({ reletedTo: userId })
      .populate('prestations')
      .populate({ path: 'employees', populate: { path: 'userAgenda' } })
      .populate({ path: 'categories', populate: { path: 'parentCategory' } })
      .lean();
    return company;
  }

  async getCompanyByEmpId(userId: string) {
    console.log(userId);
    const company = await this.companyModel
      .findOne({ employees: { $in: [userId] } })
      .populate('prestations')
      .populate({ path: 'employees', populate: { path: 'userAgenda' } })
      .populate({ path: 'categories', populate: { path: 'parentCategory' } })
      .lean();
    console.log(company);

    return company;
  }

  async getCompanyForRecap(userId: string) {
    const company = await this.companyModel
      .findOne({ reletedTo: userId })
      .populate('prestations')
      .populate('employees')
      .populate('categories')
      .lean();
    return await company;
  }

  async getCompanies(page_number: number, page_size: number, cat_id?: string) {
    if (cat_id != null) {
      const company = await this.companyModel
        .find({ categories: { $in: [cat_id] } })
        .populate('prestations')
        .populate('reletedTo')
        .populate({ path: 'categories', populate: { path: 'parentCategory' } })
        .lean();

      return {
        statusCode: 200,
        message: 'API.CATEGORYS_FETCHED',
        data: company
          .slice((page_number - 1) * page_size, page_number * page_size)
          .sort(),
        page_number,
        page_size,
        total_attributs: company.length,
      };
    } else {
      const company = await this.companyModel
        .find()
        .populate('prestations')
        .populate('reletedTo')
        .populate({ path: 'categories', populate: { path: 'parentCategory' } })
        .lean();

      return {
        statusCode: 200,
        message: 'API.CATEGORYS_FETCHED',
        data: company
          .slice((page_number - 1) * page_size, page_number * page_size)
          .sort(),
        page_number,
        page_size,
        total_attributs: company.length,
      };
    }
  }
  async searchForCompany(
    toSearch: string,
    cat: string,
    geopoint: { longitude: number; latitude: number; ray: number },
  ) {
    console.log(geopoint);
    const company = await this.companyModel
      .find({
        'address.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [geopoint.longitude, geopoint.latitude],
            },

            $maxDistance: geopoint.ray,
          },
        },
      })
      .populate({
        path: 'categories',
        select: '-_id name categories',
        match: {
          $or: [
            {
              populate: {
                path: 'categories',
                match: {
                  name: {
                    $regex: new RegExp(`${cat}`),
                    $options: 'i',
                  },
                },
              },
            },
            {
              name: {
                $regex: new RegExp(`${toSearch}`),
                $options: 'i',
              },
            },
          ],
        },
      });
    // console.log(company);
    const campanyFiltred = company.filter(
      (data: Company) => data.categories.length > 0,
    );

    return campanyFiltred;
  }

  async isNear(longitude: number, latitude: number, ray: number) {
    console.log(latitude, longitude);
    const campany = await this.companyModel.find(
      //{ _id: '6331786619decc075bb963c2' },
      {
        'address.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [latitude, longitude],
            },

            $maxDistance: ray * 10,
          },
        },
      },
    );

    return campany;
  }

  async nearestTosearch(
    subCat: string,
    longitude: number,
    latitude: number,
    page_number: number,
    page_size: number,
    toSearch?: string,
  ) {
    console.log('toS : ' + toSearch);
    console.log('lg: ' + longitude, 'lt: ' + latitude);
    toSearch == undefined || toSearch == '' ? (toSearch = null) : '';
    var mongoose = require('mongoose');
    var id = mongoose.Types.ObjectId(subCat);
    const PI = Number(3.1415926);
    //? const stunderEarthRay = 6378e3;
    const earthRayatEurope = Number(6363000);

    const degree = Number(180);
    let piplines = [];
    let query = {};
    let project = {
      //   $project: { checkPayment: 0 },
    };
    const distance = {
      $addFields: {
        distance: {
          $divide: [
            {
              $multiply: [
                earthRayatEurope,
                {
                  $multiply: [
                    2,
                    {
                      $atan2: [
                        {
                          $sqrt: {
                            $sum: [
                              {
                                $pow: [
                                  {
                                    $sin: {
                                      $divide: [
                                        {
                                          $multiply: [
                                            {
                                              $subtract: [
                                                Number(latitude),
                                                {
                                                  $arrayElemAt: [
                                                    '$address.location.coordinates',
                                                    1,
                                                  ],
                                                },
                                              ],
                                            },
                                            { $divide: [PI, degree] },
                                          ],
                                        },
                                        2,
                                      ],
                                    },
                                  },
                                  2,
                                ],
                              },
                              {
                                $multiply: [
                                  {
                                    $cos: {
                                      $multiply: [
                                        {
                                          $arrayElemAt: [
                                            '$address.location.coordinates',

                                            1,
                                          ],
                                        },

                                        ,
                                        { $divide: [PI, degree] },
                                      ],
                                    },
                                  },
                                  {
                                    $cos: {
                                      $multiply: [
                                        Number(latitude),
                                        { $divide: [PI, degree] },
                                      ],
                                    },
                                  },
                                  {
                                    $pow: [
                                      {
                                        $sin: {
                                          $divide: [
                                            {
                                              $multiply: [
                                                {
                                                  $subtract: [
                                                    Number(longitude),
                                                    {
                                                      $arrayElemAt: [
                                                        '$address.location.coordinates',

                                                        0,
                                                      ],
                                                    },
                                                  ],
                                                },
                                                {
                                                  $divide: [PI, degree],
                                                },
                                              ],
                                            },
                                            2,
                                          ],
                                        },
                                      },
                                      2,
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        },
                        {
                          $sqrt: {
                            $subtract: [
                              1,
                              {
                                $sum: [
                                  {
                                    $pow: [
                                      {
                                        $sin: {
                                          $divide: [
                                            {
                                              $multiply: [
                                                {
                                                  $subtract: [
                                                    Number(latitude),
                                                    {
                                                      $arrayElemAt: [
                                                        '$address.location.coordinates',

                                                        1,
                                                      ],
                                                    },
                                                  ],
                                                },
                                                {
                                                  $divide: [PI, degree],
                                                },
                                              ],
                                            },
                                            2,
                                          ],
                                        },
                                      },
                                      2,
                                    ],
                                  },
                                  {
                                    $multiply: [
                                      {
                                        $cos: {
                                          $multiply: [
                                            {
                                              $arrayElemAt: [
                                                '$address.location.coordinates',

                                                1,
                                              ],
                                            },

                                            { $divide: [PI, degree] },
                                          ],
                                        },
                                      },
                                      {
                                        $cos: {
                                          $multiply: [
                                            Number(latitude),
                                            { $divide: [PI, degree] },
                                          ],
                                        },
                                      },
                                      {
                                        $pow: [
                                          {
                                            $sin: {
                                              $divide: [
                                                {
                                                  $multiply: [
                                                    {
                                                      $subtract: [
                                                        Number(longitude),

                                                        {
                                                          $arrayElemAt: [
                                                            '$address.location.coordinates',

                                                            0,
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                    {
                                                      $divide: [PI, degree],
                                                    },
                                                  ],
                                                },
                                                2,
                                              ],
                                            },
                                          },
                                          2,
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            1000,
          ],
        },
      },
    };
    if (toSearch != undefined || toSearch != null) {
      console.log('entre with search ');
      //! query with search
      query = {
        $match: {
          $and: [
            { categories: { $in: [id] } },
            {
              $expr: {
                $lt: [Number('$distance'), { $sum: ['$address.ray', 1] }],
              },
            },
            { 'reletedTo.configurationLevel': 12 },
            ...SUBSECRIPTION_PAYMENT_CONDITION_FROM_COMPANY,
            {
              $or: [
                {
                  'reletedTo.firstName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'reletedTo.lastName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'reletedTo.companyName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  companyName: {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
              ],
            },
          ],
        },
      };
      //! pipline with search
      piplines = [
        distance,
        {
          $lookup: {
            from: 'users',
            localField: 'reletedTo',
            foreignField: '_id',
            as: 'reletedTo',
          },
        },
        { $unwind: '$reletedTo' },
        ...SUBSCRIPTION_CHECK_FROM_COMPANY,
        query,
        project,
      ];
    } else {
      console.log('entre without search ');
      //! query without search
      query = {
        $match: {
          $and: [
            { 'reletedTo.configurationLevel': 12 },
            ...SUBSECRIPTION_PAYMENT_CONDITION_FROM_COMPANY,
            { categories: { $in: [id] } },
            {
              $expr: {
                $lt: [Number('$distance'), { $sum: ['$address.ray', 1] }],
              },
            },
          ],
        },
      };

      //! pipline without search
      piplines = [
        distance,

        {
          $lookup: {
            from: 'users',
            localField: 'reletedTo',
            foreignField: '_id',
            as: 'reletedTo',
          },
        },
        { $unwind: '$reletedTo' },
        {
          $lookup: {
            from: 'companies',
            localField: 'reletedTo.relatedCompany',
            foreignField: '_id',
            as: 'reletedTo.relatedCompany',
          },
        },
        { $unwind: '$reletedTo.relatedCompany' },
        {
          $lookup: {
            from: 'prestations',
            localField: 'reletedTo.relatedCompany.prestations',
            foreignField: '_id',
            as: 'reletedTo.relatedCompany.prestations',
          },
        },

        {
          $lookup: {
            from: 'users',
            localField: 'reletedTo.relatedCompany.employees',
            foreignField: '_id',
            as: 'reletedTo.relatedCompany.employees',
          },
        },

        {
          $lookup: {
            from: 'categories',
            localField: 'reletedTo.relatedCompany.categories',
            foreignField: '_id',
            as: 'reletedTo.relatedCompany.categories',
          },
        },
        ...SUBSCRIPTION_CHECK_FROM_COMPANY,
        query,
        project,
      ];
    }

    //
    //

    const searchForCompaniesAll = await this.companyModel.aggregate(piplines);
    console.log('here2');

    piplines.push(
      { $skip: page_number && page_size ? (+page_number - 1) * page_size : 0 },
      { $limit: page_number && page_size ? +page_size : 10 },
    );
    const nearstCompanies = await this.companyModel.aggregate(piplines);

    const nearstCompaniesFilterd = nearstCompanies.filter((data) => {
      console.log(
        'distance between : Pro=> ',
        data.address.location.coordinates,
        ' and Client:  [lon: ',
        longitude,
        ' lat : ',
        latitude,
        ']',
        ' is ',
        data.distance,
        //Number(data.distance.toFixed(2)),
        Number(data.distance) <= Number(data.address.ray + 0.55555555555),
      );
      return Number(data.distance) <= Number(data.address.ray + 0.55555555555);
    });

    return {
      campanies: nearstCompaniesFilterd,
      campaniesLength: searchForCompaniesAll.length,
      pro: nearstCompaniesFilterd.map((camp) => camp.reletedTo),
    };
  }

  async updateCompanyVisibility() {
    await this.companyModel.updateMany({}, { show_public_employees: true });
  }

  async fetchCompanyEmployeesService(companyId: string) {
    try {
      const { reletedTo, employees,companyLogo } = await this.companyModel
        .findOne({ _id: companyId })
        .populate({ path: 'employees', populate: 'userAgenda' })
        .populate({ path: 'reletedTo', populate: 'userAgenda' })
       
      const empListe = [
        reletedTo,
        ...employees.filter((emp) => (emp.active == true&& (emp.configurationLevel>=2 || emp.userAgenda))),
      
      ];
     // console.log(empListe);
      return {listeOfEmp: empListe ,companyLogo};
    } catch (e) {
      return new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);
    }
  }


  async fetchCompanyEmployeesWithDispoService(companyId: string) {
    try {
let empListe
      const { reletedTo, employees,companyLogo } = await this.companyModel
        .findOne({ _id: companyId })
        .populate({ path: 'employees', populate: 'userAgenda' })
        .populate({ path: 'reletedTo', populate: 'userAgenda' })
      if (reletedTo["available"]==true&&reletedTo["userAgenda"]) {
        empListe = [
          reletedTo,
          ...employees.filter((emp) => (emp.active == true&& emp.available==true && (emp.configurationLevel>=2 || emp.userAgenda))),
        ];
      } else {
  //only emps
        empListe = [
          ...employees.filter((emp) => (emp.active == true&& emp.available==true && (emp.configurationLevel>=2 || emp.userAgenda))),
        ];
       }
      
     // console.log(empListe);
      return {listeOfEmp: empListe ,companyLogo};
    } catch (e) {
      return new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);
    }
  }

  // async fetchCompanyEmployeesService(companyId: string) {
  //   try {
  //     const { reletedTo, employees } = await this.companyModel
  //       .findOne({ _id: companyId })
  //       .populate({ path: 'employees', populate: 'userAgenda' })
  //       .populate({ path: 'reletedTo', populate: 'userAgenda' });
  //     const empListe = [
  //       reletedTo,
  //       ...employees.filter((emp) => (emp.active == true&& (emp.configurationLevel>=2 || emp.userAgenda))),
  //     ];
  //    // console.log(empListe);
  //     return empListe;
  //   } catch (e) {
  //     return new HttpException(SOMETHING_WENT_WRONG, HttpStatus.BAD_REQUEST);
  //   }
  // }
}
// point1=[48.87289372241354, 2.343803280672702]
// point2=[48.31530302656944, -0.17667844506802827]
