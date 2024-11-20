/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { PAGE_SIZE } from 'src/constantes/constantes';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { GetQuotationDto } from './dto/quotation-status.dto';
import { quotationsType } from 'src/shared/enums';
import { status } from 'src/shared/enums';
import { AppointmentService } from '../appointment/appointment.service';
import { Quotation } from './model/model.quotation';
import { UserToken } from 'src/shared/tokenModel';
import { isLeapYear } from 'src/shared/leap.years';
import { query } from 'express';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class QuotationService {
  constructor(
    @InjectModel(Quotation.name) private quoModel: Model<Quotation>,
    private readonly appointemntService: AppointmentService,
    private readonly payService: PaymentService,
  ) { }

  async createQuotation(quotation: Quotation) {
    return await this.quoModel.create({ ...quotation });
  }
  //! by Pro
  async getQuotationSendToMeAsPro(to: string) {
    return await this.quoModel.find({ to }).populate(['from']);
  }

  async getQuotationClient(idUser: string) {
    return await this.quoModel.find({ from: idUser }).populate(['to']);
  }

  async getQuotationPro(idUser: string, page_number?: number) {
    return await this.quoModel.find({ to: idUser }).populate(['from']);
  }

  async getProQuotations(
    idUser: string,
    toSearch: string,
    page_number: number,
    page_size: number,
  ) {
    var mongoose = require('mongoose');
    var castedUserId = mongoose.Types.ObjectId(idUser);
    const quotationslength = (
      await this.quoModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: '$to' },
        {
          $match: {
            $and: [
              { from: castedUserId },
              {
                $or: [
                  {
                    description: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'to.email': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
      ])
    ).length;
    // console.log(castedUserId);

    const quotations = await this.quoModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'to',
        },
      },
      { $unwind: '$to' },
      {
        $lookup: {
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },
      {
        $unwind: {
          path: '$to.relatedCompany',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $project: { 'to.relatedCompany.categories': 0 } },
      {
        $match: {
          $and: [
            { from: castedUserId },
            {
              $or: [
                {
                  description: {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'to.firstName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'to.lastName': {
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
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        $project: {
          from: 1,
          at_business: 1,
          at_home: 1,
          createdAt: 1,
          description: 1,
          onLineMeeting: 1,
          reply: 1,
          status: 1,
          to: 1,
          updatedAt: 1,
          _id: 1,
        },
      },

      {
        $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
      },
      { $limit: page_number && page_size ? +page_size : 10 },
      { $sort: { firstName: 1 } },
    ]);
    // console.log(quotations.length);
    return { quotations, quotationsLength: quotationslength };
  }

  //! by Client
  async getQuotationISendIt(from: string) {
    return await this.quoModel.find({ from }).populate(['to']);
  }

  async getSpecifiquotation(idClient: string, idPro: string) {
    const quotation = await this.quoModel
      .find({ from: idClient, to: idPro })
      .populate('to');
    // return quotation as Quotati on;
  }

  //! quotation details
  async getQuotation(_id: string) {
    return await this.quoModel
      .findOne({ _id })
      .populate([{ path: 'to', populate: 'relatedCompany' }, 'from']);
  }

  async updateQuotationStatus(idQuo: string, idPro: string, quoStatus: status) {
    const canAccess = this.quoModel.findOne({ _id: idQuo });
    if ((await canAccess).to == idPro) {
      return await this.updateQuotation(idQuo, {
        status: quoStatus,
      });
    } else {
      console.warn(
        'access denied ! : Oops !  maybe you trying to modified some data does not belong to you  ',
        HttpStatus.FORBIDDEN,
      );
      throw new HttpException('access denied ! ', HttpStatus.FORBIDDEN);
    }
  }
  async getQuotationForClient(
    _idClient: string,
    page_number: number,
    page_size: number,
    quotationdStatus: status,
    toSearch: string,
  ) {
    let canExe = false;
    toSearch ? (canExe = false) : (canExe = true);

    toSearch == undefined || toSearch == null ? (toSearch = '') : '';

    let mongoose = require('mongoose');
    let pipeLine = (demandeStatus: string) => [
      {
        $match: {
          $and: [
            { from: mongoose.Types.ObjectId(_idClient) },
            { status: demandeStatus },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'to',
        },
      },
      { $unwind: '$to' },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        $lookup: {
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },
      { $unwind: '$to.relatedCompany' },

      {
        $lookup: {
          from: 'agendausers',
          localField: 'to.userAgenda',
          foreignField: '_id',
          as: 'to.userAgenda',
        },
      },
      { $unwind: { path: '$to.userAgenda', preserveNullAndEmptyArrays: true } },
      //!prestations
      {
        $lookup: {
          from: 'prestations',
          localField: 'to.relatedCompany.prestations',
          foreignField: '_id',
          as: 'to.relatedCompany.prestations',
        },
      },
      //!categories
      {
        $lookup: {
          from: 'categories',
          localField: 'to.relatedCompany.categories',
          foreignField: '_id',
          as: 'to.relatedCompany.categories',
        },
      },
      //!employees
      {
        $lookup: {
          from: 'users',
          localField: 'to.relatedCompany.employees',
          foreignField: '_id',
          as: 'to.relatedCompany.employees',
        },
      },
      {
        $match: {
          $or: [
            {
              description: {
                $regex: new RegExp(`${toSearch}`),
                $options: 'i',
              },
            },
            {
              'to.firstName': {
                $regex: new RegExp(`${toSearch}`),
                $options: 'i',
              },
            },
            {
              'to.lastName': {
                $regex: new RegExp(`${toSearch}`),
                $options: 'i',
              },
            },
            {
              'to.companyName': {
                $regex: new RegExp(`${toSearch}`),
                $options: 'i',
              },
            },
            {
              'to.relatedCompany.companyName': {
                $regex: new RegExp(`${toSearch}`),
                $options: 'i',
              },
            },
          ],
        },
      },
    ];
    switch (quotationdStatus) {
      case status.PENDING: {
        const clientQuotationslengthAC = canExe
          ? await this.quoModel
            .find({ from: _idClient, status: status.ACCEPTED })
            .count()
          : 0;
        const clientQuotationslengthDc = canExe
          ? await this.quoModel
            .find({ from: _idClient, status: status.DECLINED })
            .count()
          : 0;

        const clientQuotationsAgglength = (
          await this.quoModel.aggregate([...pipeLine(status.PENDING)])
        ).length;
        const clientQuotationsAgg = await this.quoModel.aggregate([
          ...pipeLine(status.PENDING),
          { $sort: { createdAt: -1 } },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * page_size : 0,
          },
          { $limit: page_number && page_size ? +page_size : 10 },
        ]);

        return {
          statusCode: 200,
          message: 'API.QUOTATION_CLIENT_FETCHED',
          data: clientQuotationsAgg,
          page_number,
          total_attributs: clientQuotationsAgglength,
          total_attributs_acc: clientQuotationslengthAC,
          total_attributs_dc: clientQuotationslengthDc,
          total_attributs_pen: clientQuotationsAgglength,
          total_att_before_search:
            toSearch == '' ? 0 : clientQuotationsAgglength,
        };
      }
      case status.DECLINED: {
        const clientQuotationslengpen = canExe
          ? await this.quoModel
            .find({ from: _idClient, status: status.PENDING })
            .count()
          : 0;
        const clientQuotationslengthAC = canExe
          ? await this.quoModel
            .find({ from: _idClient, status: status.ACCEPTED })
            .count()
          : 0;
        const clientQuotationsAgglength = (
          await this.quoModel.aggregate([...pipeLine(status.DECLINED)])
        ).length;
        const clientQuotationsAgg = await this.quoModel.aggregate([
          ...pipeLine(status.DECLINED),
          { $sort: { createdAt: -1 } },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * page_size : 0,
          },
          { $limit: page_number && page_size ? +page_size : 10 },
        ]);

        return {
          statusCode: 200,
          message: 'API.QUOTATION_CLIENT_FETCHED',
          data: clientQuotationsAgg,
          page_number,
          total_attributs: clientQuotationsAgglength,
          total_attributs_acc: clientQuotationslengthAC,
          total_attributs_pen: clientQuotationslengpen,
          total_attributs_dc: clientQuotationsAgglength,
          total_att_before_search:
            toSearch == '' ? 0 : clientQuotationsAgglength,
        };
      }
      case status.ACCEPTED: {
        const clientQuotationsledec = canExe
          ? await this.quoModel
            .find({ from: _idClient, status: status.DECLINED })
            .count()
          : 0;

        const clientQuotationslengpen = canExe
          ? await this.quoModel
            .find({ from: _idClient, status: status.PENDING })
            .count()
          : 0;

        const clientQuotationsAgglength = (
          await this.quoModel.aggregate([...pipeLine(status.ACCEPTED)])
        ).length;
        const clientQuotationsAgg = await this.quoModel.aggregate([
          ...pipeLine(status.ACCEPTED),
          { $sort: { createdAt: -1 } },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * +page_size : 0,
          },
          { $limit: page_number && +page_size ? +page_size : 10 },
        ]);

        return {
          statusCode: 200,
          message: 'API.QUOTATION_CLIENT_FETCHED',
          data: clientQuotationsAgg,
          page_number,
          total_attributs: clientQuotationsAgglength,
          total_attributs_dec: clientQuotationsledec,
          total_attributs_pen: clientQuotationslengpen,
          total_attributs_acc: clientQuotationsAgglength,
          total_att_before_search:
            toSearch == '' ? 0 : clientQuotationsAgglength,
        };
      }
      default: {
        console.log('default');
        const clientQuotationslength = await this.quoModel
          .find({ from: _idClient })
          .count();
        const clientQuotations = await this.quoModel
          .find({ from: _idClient })
          .populate([
            {
              path: 'to',
              populate: {
                path: 'relatedCompany',
                populate: ['categories', 'employees', 'prestations'],
              },
            },
            {
              path: 'from',
              select: '_id',
            },
          ])
          .skip(page_number && page_size ? (+page_number - 1) * page_size : 0)
          .limit(page_number && page_size ? page_size : 10)
          .sort({ createdAt: -1 });

        const filtredQuotations = clientQuotations.filter(
          (quo: any) =>
            new RegExp(`${toSearch.toUpperCase()}`, 'i').test(
              quo.to.firstName.toUpperCase(),
            ) ||
            new RegExp(`${toSearch.toUpperCase()}`, 'i').test(
              quo.to.lastName.toUpperCase(),
            ) ||
            new RegExp(`${toSearch.toUpperCase()}`, 'i').test(
              quo.to.companyName.toUpperCase(),
            ) ||
            new RegExp(`${toSearch.toUpperCase()}`, 'i').test(
              quo.to.relatedCompany.companyName.toUpperCase(),
            ),
        );
        // const clientQuotationslenght = (
        //   await this.quoModel.find({ _id: _idClient })
        // ).length;

        return {
          statusCode: 200,
          message: 'API.QUOTATION_CLIENT_FETCHED',
          data: filtredQuotations,
          page_number,
          total_attributs: clientQuotationslength,
          total_att_before_search:
            toSearch == '' ? 0 : filtredQuotations.length,
        };
      }
    }
  }

  //! quotation all
  async getQuotations(pagination: PaginationDto) {
    const quotations = await this.quoModel
      .find()
      .populate(['to', 'from'])
      .sort({ createdAt: 1 });
    const { page_number, page_size } = pagination;

    return {
      statusCode: 200,
      message: 'API. QUOTATION_FETCHED',
      data: quotations.slice(
        (page_number - 1) * page_size,
        page_number * page_size,
      ),
      page_number,
      page_size,
      total_attributs: quotations.length,
    };
  }
  async getClientQuotations(
    idClient: string,
    page_number: number,
    page_size: number,
    toSearch: string,
  ) {
    var mongoose = require('mongoose');
    var castedClientId = mongoose.Types.ObjectId(idClient);

    const length = (
      await this.quoModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: '$from' },

        // { $project: { 'from.relatedCompany.categories': 0 } },
        {
          $match: {
            $and: [
              { to: castedClientId },
              { status: status.PENDING },
              {
                $or: [
                  {
                    description: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.email': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
      ])
    ).length;
    const quotations = await this.quoModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        $match: {
          $and: [
            { to: castedClientId },
            { status: status.PENDING },
            {
              $or: [
                {
                  description: {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'from.firstName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'from.lastName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'from.email': {
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
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'to',
        },
      },
      { $unwind: '$to' },
      {
        $project: {
          at_business: 1,
          at_home: 1,
          createdAt: 1,
          description: 1,
          onLineMeeting: 1,
          reply: 1,
          status: 1,
          from: 1,
          updatedAt: 1,
          _id: 1,
          'to._id': 1,
        },
      },

      // { $project: { 'from.relatedCompany.categories': 0 } },
      {
        $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
      },
      { $limit: page_number && page_size ? +page_size : 10 },
      { $sort: { firstName: 1 } },
    ]);

    return { quotations, quotationsLength: length };
  }
  async updateQuotation(idQuo: string, data: any) {
    //  console.log(idQuo, { ...data });
    return await this.quoModel.updateOne({ _id: idQuo }, { ...data });
  }
  async getQuotationLengthByPro(idPro: string) {
    return (await this.quoModel.find({ to: idPro })).length;
  }


  async getQuotationPendingLengthByPro(idPro: string) {
    return (await this.quoModel.find({ to: idPro, status: status.PENDING })).length;
  }

  async getQuotationsForPro(
    idUser: string,
    toSearch: string,
    page_number: number,
    page_size: number,
  ) {
    var mongoose = require('mongoose');
    var castedUserId = mongoose.Types.ObjectId(idUser);
    console.log(toSearch);
    toSearch == undefined || toSearch == null ? (toSearch = '') : '';
    const quotationslength = (
      await this.quoModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: '$to' },
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        {
          $match: {
            $and: [
              { 'to._id': castedUserId },
              { status: status.PENDING },
              {
                $or: [
                  {
                    description: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.email': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
      ])
    ).length;
    // console.log(castedUserId);

    const quotations = await this.quoModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'to',
        },
      },
      { $unwind: '$to' },
      {
        $lookup: {
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },
      {
        $unwind: {
          path: '$to.relatedCompany',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        $match: {
          $and: [
            { 'to._id': castedUserId },
            { status: status.PENDING },
            {
              $or: [
                {
                  description: {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'from.firstName': {
                    $regex: new RegExp(`${toSearch}`),
                    $options: 'i',
                  },
                },
                {
                  'from.lastName': {
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
        $project: {
          from: 1,
          at_business: 1,
          at_home: 1,
          createdAt: 1,
          description: 1,
          onLineMeeting: 1,
          reply: 1,
          status: 1,
          // ! because getting quotaions as Pro
          to: 1,
          updatedAt: 1,
          _id: 1,
        },
      },

      {
        $skip: page_number && page_size ? (+page_number - 1) * page_size : 0,
      },
      { $limit: page_number && page_size ? +page_size : 10 },
      { $sort: { firstName: 1 } },
    ]);
    // console.log(quotations.length);
    return {
      statusCode: 200,
      message: 'API.QUOTATION_FETCHED',
      data: [...quotations],
      page_number,
      total_attributs: quotationslength,
      total_attributs_app:
        await this.appointemntService.countAppointmentService(idUser),
    };
  }

  async getPrestationStatus(getQuotationDto: GetQuotationDto) {
    // { to: ObjectId('633d8caeca5a7bae98dbb325'), status: "accepted", appointment_taken: false }
    // { to: ObjectId('633d8caeca5a7bae98dbb325'), status: "accepted", appointment_taken: true }
    try {
      let quotations = await this.quoModel.find({
        to: getQuotationDto.id,
        status: 'accepted',
        appointment_taken: getQuotationDto.appointment_status,
      });
      let quotations_before_decision = await this.quoModel.find({
        to: getQuotationDto.id,
        status: 'accepted',
      });
      let quotations_accepted = await this.quoModel.find({
        to: getQuotationDto.id,
        status: 'accepted',
        appointment_taken: true,
      });
      let quotations_declined = await this.quoModel.find({
        to: getQuotationDto.id,
        status: 'accepted',
        appointment_taken: false,
      });

      return {
        statusCode: 200,
        message: 'API.GET_QUOTATION_BY_STATUS',
        data: quotations,
        total_quotation: quotations_before_decision.length,
        total_quotation_accepted: quotations_accepted.length,
        total_quotation_declined: quotations_declined.length,
      };
    } catch (error) {
      console.log('API.GET_QUOTATION_BY_STATUS error : ', error);
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }
  //!from Walid :✂️ - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - - sprint4 - - - - - - -
  async exportTransferService(me: UserToken, month: number, year: number) {
    console.log('here');

    let lastDayInMonth = {
      1: 31,
      2: isLeapYear(year) ? 29 : 28,
      3: 31,
      4: 30,
      5: 31,
      6: 30,
      7: 31,
      8: 31,
      9: 30,
      10: 31,
      11: 30,
      12: 31,
    };
    var mongoose = require('mongoose');
    var castedUserId = mongoose.Types.ObjectId(me._id);
    // console.log(
    //   new Date(
    //     `${year}-${month.toString().length < 2 ? '0' + month : month}-01`,
    //   ),
    //   new Date(
    //     `${year}-${month.toString().length < 2 ? '0' + month : month}-${
    //       lastDayInMonth[month]
    //     }T23:00:00.000Z`,
    //   ),
    // );

    const inBetweenQuery = {
      createdAt: {
        $gte: new Date(
          `${year}-${month.toString().length < 2 ? '0' + month : month}-01`,
        ),
        $lte: new Date(
          `${year}-${month.toString().length < 2 ? '0' + month : month}-${lastDayInMonth[month]
          }T23:00:00.000Z`,
        ),
      },
    };
    // console.log(inBetweenQuery);

    let query = [
      {
        $lookup: {
          from: 'users',
          localField: 'to',
          foreignField: '_id',
          as: 'to',
        },
      },
      { $unwind: '$to' },
      {
        $lookup: {
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },
      {
        $unwind: {
          path: '$to.relatedCompany',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        $match: {
          $and: [
            inBetweenQuery,
            { 'to._id': castedUserId },
            { $or: [{ status: status.ACCEPTED }, { status: status.PENDING }] },
          ],
        },
      },
    ];
    const quotationslength = (await this.quoModel.aggregate([...query])).length;
    console.log('heeeeeeeeeeeeer');

    const totalFacture = await this.payService.totalFacture(
      me,
      new Date(
        `${year}-${month.toString().length < 2 ? '0' + month : month}-01`,
      ),
      new Date(
        `${year}-${month.toString().length < 2 ? '0' + month : month}-${lastDayInMonth[month]
        }T23:00:00.000Z`,
      ),
    );

    return {
      statusCode: 200,
      message: 'API.QUOTAIONS&FACTURATIONS',
      data: {
        quotationslength,
        factureslength: totalFacture,
        month,
        year,
      },
    };
  }

  async exportQuotationService(
    user: UserToken,
    month: number,
    year: number,
    type: quotationsType,
    pagination: { page_number: number; page_size: number },
    toSearch?: string,
  ) {
    try {
      if (year > 9999 || year < 2000) {
        throw new Error('Invalid year value ! ');
      }
      const { page_number, page_size } = pagination;
      var mongoose = require('mongoose');
      var castedUserId = mongoose.Types.ObjectId(user._id);
      toSearch = toSearch == null || toSearch == undefined ? '' : toSearch;
      //!NT
      const aCtiveStatusQuery = { status: status.PENDING };
      //!T
      const uNactiveStatusQuery = {
        $or: [{ status: status.ACCEPTED }],
      };
      let lastDayInMonth = {
        1: 31,
        2: isLeapYear(year) ? 29 : 28,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31,
      };
      // date interval
      const inBetweenQuery = {
        createdAt: {
          $gte: new Date(
            `${year}-${month.toString().length < 2 ? '0' + month : month}-01`,
          ),
          $lte: new Date(
            `${year}-${month.toString().length < 2 ? '0' + month : month}-${lastDayInMonth[month]
            }T23:00:00.000Z`,
          ),
        },
      };
      // ! the lettre a means active or {pending}
      let aquery = [
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: '$to' },
        {
          $lookup: {
            from: 'companies',
            localField: 'to.relatedCompany',
            foreignField: '_id',
            as: 'to.relatedCompany',
          },
        },
        {
          $unwind: {
            path: '$to.relatedCompany',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: '$from' },
        {
          $match: {
            $and: [
              inBetweenQuery,
              { 'to._id': castedUserId },
              aCtiveStatusQuery,
              {
                $or: [
                  {
                    description: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ['$from.firstName', ' ', '$from.lastName'],
                        },
                        regex: new RegExp(`${toSearch}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    'from.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
      ];
      // ! the lettre u means unactive or {!pending}
      let uquery = [
        {
          $lookup: {
            from: 'users',
            localField: 'to',
            foreignField: '_id',
            as: 'to',
          },
        },
        { $unwind: '$to' },
        {
          $lookup: {
            from: 'companies',
            localField: 'to.relatedCompany',
            foreignField: '_id',
            as: 'to.relatedCompany',
          },
        },
        {
          $unwind: {
            path: '$to.relatedCompany',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: '$from' },
        {
          $match: {
            $and: [
              inBetweenQuery,
              { 'to._id': castedUserId },
              uNactiveStatusQuery,
              {
                $or: [
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ['$from.firstName', ' ', '$from.lastName'],
                        },
                        regex: new RegExp(`${toSearch}`),
                        options: 'i',
                      },
                    },
                  },
                  {
                    description: {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.firstName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                  {
                    'from.lastName': {
                      $regex: new RegExp(`${toSearch}`),
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
      ];
      if (type == quotationsType.T) {
        const uQuotationslength = (await this.quoModel.aggregate([...uquery]))
          .length;
        let query = [
          {
            $lookup: {
              from: 'users',
              localField: 'to',
              foreignField: '_id',
              as: 'to',
            },
          },
          { $unwind: '$to' },
          {
            $match: {
              $and: [
                inBetweenQuery,
                { 'to._id': castedUserId },
                aCtiveStatusQuery,
              ],
            },
          },
        ];
        const aQuotationslength = (await this.quoModel.aggregate([...query]))
          .length;
        const uQuotations = await this.quoModel.aggregate([
          ...uquery,
          {
            $project: {
              from: 1,
              at_business: 1,
              at_home: 1,
              createdAt: 1,
              description: 1,
              onLineMeeting: 1,
              reply: 1,
              status: 1,

              to: 1,
              updatedAt: 1,
              _id: 1,
            },
          },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * page_size : 0,
          },
          { $limit: page_number && page_size ? +page_size : 10 },
          { $sort: { createdAt: -1 } },
        ]);

        return {
          statusCode: 200,
          message: 'API.QUOTAIONS',
          data: {
            T_Quotations: uQuotations,
            T_Quotationslength: uQuotationslength,
            NT_Quotationslength: aQuotationslength,
            month,
            year,
            page_number,
            page_size,
            toSearch,
            type: 'T',
          },
        };
      } else if (quotationsType.NT) {
        const aQuotationslength = (await this.quoModel.aggregate([...aquery]))
          .length;
        let query = [
          {
            $lookup: {
              from: 'users',
              localField: 'to',
              foreignField: '_id',
              as: 'to',
            },
          },
          { $unwind: '$to' },
          {
            $match: {
              $and: [
                inBetweenQuery,
                { 'to._id': castedUserId },
                uNactiveStatusQuery,
              ],
            },
          },
        ];
        const uQuotationslength = (await this.quoModel.aggregate([...query]))
          .length;
        const aQuotations = await this.quoModel.aggregate([
          ...aquery,
          {
            $project: {
              from: 1,
              at_business: 1,
              at_home: 1,
              createdAt: 1,
              description: 1,
              onLineMeeting: 1,
              reply: 1,
              status: 1,

              to: 1,
              updatedAt: 1,
              _id: 1,
            },
          },
          {
            $skip:
              page_number && page_size ? (+page_number - 1) * page_size : 0,
          },
          { $limit: page_number && page_size ? +page_size : 10 },
          { $sort: { createdAt: -1 } },
        ]);
        return {
          statusCode: 200,
          message: 'API.QUOTAIONS',
          data: {
            NT_Quotations: aQuotations,
            NT_Quotationslength: aQuotationslength,
            T_Quotationslength: uQuotationslength,
            month,
            year,
            page_number,
            page_size,
            toSearch,
            type: 'NT',
          },
        };
      }
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
  async getPendingQuotationNumber(to) {
    return await this.quoModel.find({ to, status: 'pending' });
  }

  async fetchQuotationComptable(skip, limit, query) {
    let quotation_data = [];
    if (query.skip_fetch == false)
      quotation_data = await this.quoModel.aggregate([
        {
          $match: {
            //@ts-ignore
            to: new mongoose.Types.ObjectId(query.user_id),
            status: query.status,
            $and: [
              { createdAt: { $gte: new Date(query.from_date) } },
              { createdAt: { $lte: new Date(query.to_date) } },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'from',
            foreignField: '_id',
            as: 'from',
          },
        },
        { $unwind: '$from' },
        {
          $match: {
            $or: [
              {
                $expr: {
                  $regexMatch: {
                    input: {
                      $concat: ['$from.firstName', ' ', '$from.lastName'],
                    },
                    regex: new RegExp(`${query.search}`),
                    options: 'i',
                  },
                },
              },
              {
                'from.firstName': {
                  $regex: new RegExp(`${query.search}`),
                  $options: 'i',
                },
              },
              {
                'from.lastName': {
                  $regex: new RegExp(`${query.search}`),
                  $options: 'i',
                },
              },
              {
                'from.phoneNumber': {
                  $regex: new RegExp(`${query.search}`),
                  $options: 'i',
                },
              },
            ],
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]);
    const count = await this.quoModel.aggregate([
      {
        $match: {
          //@ts-ignore
          to: new mongoose.Types.ObjectId(query.user_id),
          status: query.status,
          $and: [
            { createdAt: { $gte: new Date(query.from_date) } },
            { createdAt: { $lte: new Date(query.to_date) } },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: '$from' },
      {
        $match: {
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: ['$from.firstName', ' ', '$from.lastName'],
                  },
                  regex: new RegExp(`${query.search}`),
                  options: 'i',
                },
              },
            },
            {
              'from.firstName': {
                $regex: new RegExp(`${query.search}`),
                $options: 'i',
              },
            },
            {
              'from.lastName': {
                $regex: new RegExp(`${query.search}`),
                $options: 'i',
              },
            },
            {
              'from.phoneNumber': {
                $regex: new RegExp(`${query.search}`),
                $options: 'i',
              },
            },
          ],
        },
      },
    ]);
    return { data: quotation_data, count: count.length };
  }

  async quotationComptable(
    user,
    search,
    from_date,
    to_date,
    page_size,
    page_number,
    status,
  ) {
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    let quotation_treated;
    let quotation_not_treated;
    if (!search) search = '';
    if (status == 'pending') {
      quotation_not_treated = await this.fetchQuotationComptable(skip, limit, {
        from_date,
        to_date,
        user_id: user._id,
        search,
        status,
        skip_fetch: false,
      });
      quotation_treated = await this.fetchQuotationComptable(skip, limit, {
        from_date,
        to_date,
        user_id: user._id,
        search: '',
        status: 'accepted',
        skip_fetch: true,
      });
    } else {
      quotation_treated = await this.fetchQuotationComptable(skip, limit, {
        from_date,
        to_date,
        user_id: user._id,
        search,
        status,
        skip_fetch: false,
      });
      quotation_not_treated = await this.fetchQuotationComptable(skip, limit, {
        from_date,
        to_date,
        user_id: user._id,
        search: '',
        status: 'pending',
        skip_fetch: true,
      });
    }

    return {
      statusCode: 200,
      message: 'API.DEVIS.FETCHED',
      data: {
        quotation_treated: quotation_treated.data,
        quotation_treated_total: quotation_treated.count,
        quotation_not_treated: quotation_not_treated.data,
        quotation_not_treated_total: quotation_not_treated.count,
      },
    };
  }

  async fetchQuotationWithFilter(query) {
    await this.quoModel.find(query);
  }
}
