import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreatePaymentDto } from "src/api/payment/dto/create-payment.dto";
import { Prestation } from "src/api/prestation/models/prestation.model";
import { Quotation } from "src/api/quotation/model/model.quotation";

@Injectable()
export class CheckDevisAppointmentPipe implements PipeTransform {
  constructor(
    @InjectModel(Prestation.name) private readonly prestationModel: Model<Prestation>,
    @InjectModel(Quotation.name) private quoModel: Model<Quotation>,
  ) {}

  async transform(value: CreatePaymentDto, metadata: ArgumentMetadata) {

    if (value.quotationId ) {
      /* fetch the quotation data */
      const quotation_data = await this.quoModel.findOne({_id:value.quotationId})
      /* create the prestation with the appropriate data*/
      const create_prestation = await this.prestationModel.findOneAndUpdate(
        {
          name: quotation_data.reply['name'],
          duration: quotation_data.reply['duration'],
          fee: quotation_data.reply['fee'],
          fee_online: quotation_data.reply['fee'],
          fee_at_home: quotation_data.reply['fee'],
          onLineMeeting: quotation_data['onLineMeeting'],
          at_home: quotation_data['at_home'],
          at_business: quotation_data['at_business'],
        },
        {
          name: quotation_data.reply['name'],
          duration: quotation_data.reply['duration'],
          fee: quotation_data.reply['fee'],
          fee_online: quotation_data.reply['fee'],
          fee_at_home: quotation_data.reply['fee'],
          onLineMeeting: quotation_data['onLineMeeting'],
          at_home: quotation_data['at_home'],
          at_business: quotation_data['at_business'],
        },{new:true , upsert:true}
      );

    value["prestationId"] = [{prestationId: create_prestation._id,
    online : create_prestation.onLineMeeting,
    at_home : create_prestation.at_home,
    at_business : create_prestation.at_business}]

     }
    return value;
  }
}
