import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SUCCEEDED } from 'src/constantes/constantes';
import { apiReturner } from 'src/shared/returnerApi';

import { CompanyService } from '../companies/company.service';

import { Prestation } from './models/prestation.model';
import { CreatePrestationDto } from './prestation.dto';

@Injectable()
export class PrestationService {
  constructor(
    @InjectModel(Prestation.name) private presModel: Model<Prestation>,
    private companyservise: CompanyService,
  ) {}

  async create(createPrestationDto: Prestation, companyId: string) {
    delete createPrestationDto._id;
    console.log(companyId);
    console.log(createPrestationDto);

    const comp = await this.presModel.create({
      ...createPrestationDto,
      cached: false,
      relatedCompany: companyId,
    });
    console.log('companyyyyyyyyyyy', comp);

    return comp._id;
    // const val = Promise.all(
    //   createPrestationDto.listeOfPrestation.map(async (prestations) => {
    //     console.log('prestations');
    //     console.log(prestations);
    //     const { _id, name } = await this.presModel.findOneAndUpdate(
    //       { relatedCompany: companyId },
    //       {
    //         ...prestations,
    //       },
    //       { $upset: true },
    //     );
    //     console.log(_id, name);
    //     return _id;
    //   }),
    // );

    // return createPrestationDto.listeOfPrestation.map(async (prestation) => {
    //   const { _id } = await this.presModel.create({
    //     relatedCompany: companyId,
    //     ...prestation,
    //   });

    //   return this.table.push(_id.toString());
    // });
  }

  async findWithQuery(query) {
    return await this.presModel.find(query);
  }

  async findAllPress(companyId: string, pressIds) {
    if (pressIds)
      return await this.presModel
        .find({ _id: { $in: pressIds }, cached: false })
        .sort({ createdAt: 1 });
    return await this.presModel
      .find({ relatedCompany: companyId, cached: false })
      .sort({ createdAt: 1 });
  }
  async updateOrCreatePrestation(companyid: string, pres: Prestation) {
    console.log('heeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee update pres', companyid);
    return await this.presModel.findOneAndUpdate(
      {
        _id: pres._id,
      },
      { relatedCompany: companyid, ...pres },
      { upsert: true, new: true },
    );
  }

  findOne(id: number) {
    return `This action returns a #${id} benefit`;
  }

  async update(createPrestationDto: CreatePrestationDto) {
    var table: any = [];
    for (let i = 0; i < createPrestationDto.listeOfPrestation.length; i++) {
      const result = await this.presModel.findOneAndUpdate(
        { _id: createPrestationDto.listeOfPrestation[i]._id },
        {
          name: createPrestationDto.listeOfPrestation[i].name,
          duration: createPrestationDto.listeOfPrestation[i].duration,
          durationv2: createPrestationDto.listeOfPrestation[i].durationv2,
          fee: createPrestationDto.listeOfPrestation[i].fee,
        },
      );
      table.push(result);
    }
    if (table.length > 0) {
      return apiReturner(HttpStatus.CREATED, SUCCEEDED);
    } else {
      throw new InternalServerErrorException('update_failed');
    }
  }

  async remove(_idPres: string, userId: string) {
    try {
      const updated = await this.presModel.findOneAndUpdate(
        { _id: _idPres },
        { cached: true },
      );
      const campany = await this.companyservise.getCompanyByUserId(userId);

      const prestationfilter = campany.prestations.filter(
        (pres) => pres._id != _idPres,
      );

      const update = await this.companyservise.updateCompany(userId, {
        prestations: prestationfilter,
      });
      if (!updated && !update) {
        throw new HttpException(
          'upadate failed',
          HttpStatus.METHOD_NOT_ALLOWED,
        );
      }

      return apiReturner(HttpStatus.ACCEPTED, SUCCEEDED);
    } catch (e) {
      throw new InternalServerErrorException('failed to cached object');
    }
  }

  async calculateAppointmentEndDate(prestationId, user, startDate) {
    let prestation_duration = 0;
    let duration_without_break = 0;
    const fetch_appointments = await this.findWithQuery({
      _id: { $in: prestationId },
      cached: false,
    });
    /* fetch the company data */
    const companyData = await this.companyservise.getCompanyByUserId(user._id);
    for (let i = 0; i < fetch_appointments.length; i++) {
      if (i == 0) {
        console.log(companyData['break_duration_in_minutes']);
        prestation_duration += Number(companyData['break_duration_in_minutes']);
      }
      duration_without_break += Number(fetch_appointments[i]['duration']);
      prestation_duration += Number(fetch_appointments[i]['duration']);
    }
    return {
      duration: prestation_duration,
      end_date: new Date(
        new Date(startDate).getTime() + prestation_duration * 60000,
      ),
      duration_without_break,
      break_duration: Number(companyData['break_duration_in_minutes']),
    };
  }
  async fetchCompanyPrestation(companyId, _id) {
    return {
      statusCode: 200,
      message: 'API.PRESTATIONS_FETCHED',
      data: await this.presModel.find({
        relatedCompany: companyId,
        cached: false,
      }),
    };
  }

  async all() {
    await this.presModel.updateMany({}, { cached: false });
  }
}
