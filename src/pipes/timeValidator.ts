import { ArgumentMetadata, HttpException, HttpStatus, Injectable, PipeTransform } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Appointment } from "src/api/appointment/schemas/appointment.entity";
import * as moment from 'moment';
import { StartAppointmentDto } from "src/api/appointment/dto/start-appointment.dto";
import { Events } from "src/api/events/schemas/event.entity";

@Injectable()
export class CheckTimeValidatorAppointmentPipe implements PipeTransform {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
  ) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    let res ;
    let end_date ;
    let start_date = moment().utc();
    if (value.appointmentId) {
      /* fetch the quotation data */
      const appointment_data = await this.appointmentModel.findOne({
        _id: value.appointmentId,
        /* check difference between times */
      });

      end_date = appointment_data.start_date;
     }
      res = moment(end_date).utc().diff(start_date, 'minute', false);
      if (Math.abs(res) > 5 )
       throw new HttpException("API.WRONG_TIME", HttpStatus.FORBIDDEN);
    return value;
  }
}

@Injectable()
export class CheckTimeValidatorEventPipe implements PipeTransform {
  constructor(
    @InjectModel(Events.name) private eventsModel: Model<Events>,
  ) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    let res;
    let end_date;
    let start_date = moment().utc();
    if (value.eventId) {
      //eventId
      const event_data = await this.eventsModel.findOne({ _id: value.eventId });
      end_date = event_data.start_date;
    }
    res = moment(end_date).utc().diff(start_date, 'minute', false);
    if (Math.abs(res) > 5)
      throw new HttpException('API.WRONG_TIME', HttpStatus.FORBIDDEN);
    return value;
  }
}



