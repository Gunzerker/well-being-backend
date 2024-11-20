import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import mongoose, { Model } from 'mongoose';
import { diff_minutes } from 'src/shared/diff_minutes';
import {
  Appointment,
  AppointmentInstance,
} from '../appointment/schemas/appointment.entity';
import { FilesS3Service } from '../auth/s3.service';
import { CompanyService } from '../companies/company.service';
import { PaymentService } from '../payment/payment.service';
import { Quotation } from '../quotation/model/model.quotation';
import { QuotationService } from '../quotation/quotation.service';
import { UsersService } from '../users/users.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet } from './schema/wallet.entity';
@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @Inject(forwardRef(() => UsersService))
    private userService: UsersService,
    private paymentService: PaymentService,
    private companyService: CompanyService,
    @InjectModel(Quotation.name) private quoModel: Model<Quotation>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
  ) {}

  create(createWalletDto: CreateWalletDto) {
    return 'This action adds a new wallet';
  }

  async createWallet(proId) {
    return await this.walletModel.create({ proId });
  }

  async updateWallet(proId, query) {
    /* fetch pro stripe account */
  //   const Stripe = require("stripe")
  //   const stripe = new Stripe(process.env.STRIPE, {
  //     apiVersion: '2022-08-01',
  //   });
  //   const user_data = await this.userService.findUserBy({_id:proId})
  //   try{
  //   const transfer = await stripe.transfers.create({
  //     amount: query["$inc"]["amount"],
  //     currency: 'eur',
  //     destination: user_data.stripe_account_id,
  //   });
  // }catch(err){
  //   throw new HttpException(
  //     'Funds can t be sent to accounts located in US because it s restricted outside of your platform s region',
  //     HttpStatus.SERVICE_UNAVAILABLE,
  //   );
  // }
    return await this.walletModel.findOneAndUpdate({ proId }, query, {
      new: true,upsert:true
    });
  }

  findAll() {
    return `This action returns all wallet`;
  }

  findOne(id: number) {
    return `This action returns a #${id} wallet`;
  }

  update(id: number, updateWalletDto: UpdateWalletDto) {
    return `This action updates a #${id} wallet`;
  }

  remove(id: number) {
    return `This action removes a #${id} wallet`;
  }

  async fetchPerformance(year, user) {
    /* fetch current wallet */
    const fetch_current_wallet = await this.walletModel.findOne({
      proId: user._id,
    });
    /***********************/
    /* fetch my clients number */
    const fetch_my_clients = await this.userService.searchUsersWithAggregate([
      {
        $match: {
          //@ts-ignore
          proId: new mongoose.Types.ObjectId(user._id),
          type: 'CLIENTSHIP',
          $and: [
            { createdAt: { $gte: new Date(Date.UTC(year, 0, 1)) } },
            {
              createdAt: { $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
            },
          ],
        },
      },
    ]);
    /***********************/
    /* revenu */
    const revenus = await this.paymentService.fetchWithAggregate([
      {
        $match: {
          $or: [{ status: 'Success' } , {no_show:true}],

          //@ts-ignore
          to: new mongoose.Types.ObjectId(user._id),
          $and: [
            { createdAt: { $gte: new Date(Date.UTC(year, 0, 1)) } },
            {
              createdAt: { $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointmentId',
        },
      },
      {
        $unwind: { path: '$appointmentId', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'eventId',
        },
      },
      {
        $unwind: { path: '$eventId', preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          $or: [{ 'eventId.ended': true }, { 'appointmentId.finished': true }],
        },
      },

      {
        $group: {
          _id: null,
          count: { $sum: {$cond: { if: { 'appointmentId': [ "$ne", null ] }, then: -100, else: 0 }}},
          total : {$sum : '$amount'}
        },
      },
    ]); 
    /***********************/
    /* revenus events */
    const revenus_event = await this.paymentService.fetchWithAggregate([
      {
        $match: {
          status: 'Success',
          type: 'Event',
          //@ts-ignore
          to: new mongoose.Types.ObjectId(user._id),
          $and: [
            { createdAt: { $gte: new Date(Date.UTC(year, 0, 1)) } },
            {
              createdAt: { $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'eventId',
        },
      },
      {
        $unwind: { path: '$eventId' },
      },
      {
        $match: {
          'eventId.ended': true,
        },
      },

      {
        $group: {
          _id: null,
          count: { $sum: -100},
          total: { $sum: '$amount' },
        },
      },
    ]);
    /***********************/
    /* available qutation */
    const total_pending_quotation = await this.quoModel.count({
      to: user._id,
      status: 'pending',
    });
    /*********************/
    /* fetch rating*/
    const rating = await this.userService.fetchRatingWithFilter({
      to: user._id,
      $and: [
        { createdAt: { $gte: new Date(Date.UTC(year, 0, 1)) } },
        {
          createdAt: { $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
        },
      ],
    });
    let rating_avg = 0;
    for (let i = 0; i < rating.length; i++) rating_avg += rating[i].value;
    rating_avg = Math.round(rating_avg / rating.length);
    /*********************/
    /* avg response in quotation */
    const quotation = await this.quoModel.find({
      to: user._id,
      $or: [{ status: 'accepted' }, { status: 'declined' }],
      $and: [
        { createdAt: { $gte: new Date(Date.UTC(year, 0, 1)) } },
        {
          createdAt: { $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
        },
      ],
    });
    let response_avg = 0;
    for (let i = 0; i < quotation.length; i++)
      response_avg += diff_minutes(
        quotation[i]['createdAt'],
        quotation[i]['updatedAt'],
      );
    //       enum: ['Pending', 'Accepted', 'Refused', 'PostPoned', 'Canceled'],
    const appointment = await this.appointmentModel.find({
      to: user._id,
      $or: [
        { status: 'Accepted' },
        { status: 'Refused' },
        { status: 'PostPoned' },
        { status: 'Canceled' },
      ],
      $and: [
        { createdAt: { $gte: new Date(Date.UTC(year, 0, 1)) } },
        {
          createdAt: { $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
        },
      ],
    });
    for (let i = 0; i < appointment.length; i++)
      response_avg += diff_minutes(
        appointment[i]['createdAt'],
        appointment[i]['updatedAt'],
      );
    response_avg = Math.round(
      response_avg / (appointment.length + quotation.length),
    );
    /*********************/
    const fetch_wallet = await this.fetchStripeWallet(user)
    return {
      statusCode: 200,
      message: 'API.APPOINTMENT_POSTPONED',
      data: {
        curret: fetch_wallet.data.available.amount,
        incoming:fetch_wallet.data.pending.amount,
        fetch_my_clients: fetch_my_clients.length,
        revenus: revenus[0]?.total ? (Number(revenus[0]?.total)+Number(revenus[0]?.count)) / 100 : 0,
        revenus_event: revenus_event[0]?.total?
          (Number(revenus_event[0]?.total)+Number(revenus_event[0]?.count)) / 100 : 0,
        pending_quotation: total_pending_quotation,
        number_of_rating: rating.length,
        rating_avg: rating_avg ? rating_avg : 0,
        response_avg: response_avg ? response_avg : 0,
      },
    };
  }

  async fetchSubInvoice(
    page_size,
    page_number,
    search,
    user,
    from_date,
    to_date,
  ) {
    /* fetch data from payment */
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const { appointment_data, appointment_total } =
      await this.paymentService.fetchAppointmentInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { eventPack_data, eventPack_total } =
      await this.paymentService.fetchEventPackInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { event_data, event_total } =
      await this.paymentService.fetchEventInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { sub_data, sub_total } = await this.paymentService.fetchSubInvoice(
      skip,
      limit,
      search,
      user,
      from_date,
      to_date,
      false,
    );
    return {
      statusCode: 200,
      message: 'API.APPOINTMENT_POSTPONED',
      data: sub_data,
      sub_total,
      //TODO:To implement later
      event_total: event_total,
      appointment_total: appointment_total,
      eventPack_total,
    };
  }

  async fetchEventInvoice(
    page_size,
    page_number,
    search,
    user,
    from_date,
    to_date,
  ) {
    /* fetch data from payment */
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const { appointment_data, appointment_total } =
      await this.paymentService.fetchAppointmentInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { event_data, event_total } =
      await this.paymentService.fetchEventInvoice(
        skip,
        limit,
        search,
        user,
        from_date,
        to_date,
        false,
      );

    const { eventPack_data, eventPack_total } =
      await this.paymentService.fetchEventPackInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );

    const { sub_data, sub_total } = await this.paymentService.fetchSubInvoice(
      skip,
      limit,
      '',
      user,
      from_date,
      to_date,
      true,
    );

    return {
      statusCode: 200,
      message: 'API.APPOINTMENT_POSTPONED',
      data: event_data,
      sub_total: sub_total,
      //TODO:To implement later
      event_total: event_total,
      appointment_total: appointment_total,
      eventPack_total,
    };
  }

  async fetchAppointmentInvoice(
    page_size,
    page_number,
    search,
    user,
    from_date,
    to_date,
  ) {
    /* fetch data from payment */
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const { appointment_data, appointment_total } =
      await this.paymentService.fetchAppointmentInvoice(
        skip,
        limit,
        search,
        user,
        from_date,
        to_date,
        false,
      );
    const { event_data, event_total } =
      await this.paymentService.fetchEventInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );

    const { eventPack_data, eventPack_total } =
      await this.paymentService.fetchEventPackInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { sub_data, sub_total } = await this.paymentService.fetchSubInvoice(
      skip,
      limit,
      '',
      user,
      from_date,
      to_date,
      true,
    );
    return {
      statusCode: 200,
      message: 'API.APPOINTMENT_POSTPONED',
      data: appointment_data,
      sub_total: sub_total,
      //TODO:To implement later
      event_total: event_total,
      appointment_total: appointment_total,
      eventPack_total,
    };
  }

  async fetchEventPackInvoice(
    page_size,
    page_number,
    search,
    user,
    from_date,
    to_date,
  ) {
    /* fetch data from payment */
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const { appointment_data, appointment_total } =
      await this.paymentService.fetchAppointmentInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { event_data, event_total } =
      await this.paymentService.fetchEventInvoice(
        skip,
        limit,
        '',
        user,
        from_date,
        to_date,
        true,
      );

    const { eventPack_data, eventPack_total } =
      await this.paymentService.fetchEventPackInvoice(
        skip,
        limit,
        search,
        user,
        from_date,
        to_date,
        false,
      );
    const { sub_data, sub_total } = await this.paymentService.fetchSubInvoice(
      skip,
      limit,
      '',
      user,
      from_date,
      to_date,
      true,
    );
    return {
      statusCode: 200,
      message: 'API.APPOINTMENT_POSTPONED',
      data: eventPack_data,
      sub_total: sub_total,
      //TODO:To implement later
      event_total: event_total,
      appointment_total: appointment_total,
      eventPack_total,
    };
  }

  async transfertPayment(transfertPaymentDto, user) {
    /* fetch current user data */
    const user_data = await this.userService.findUserBy({ _id: user._id });
    const current_wallet = await this.walletModel.findOne({proId:user._id})
    if (Number(current_wallet?.amount) < Number( (transfertPaymentDto.amount)*100))
      throw new HttpException('Insuffisant funds', HttpStatus.PAYMENT_REQUIRED);

    try {
      await this.paymentService.transfertPayment(
        Number(transfertPaymentDto.amount) * 100,
        user_data,
      );
      await this.walletModel.findOneAndUpdate(
        {
          proId: user._id,
        },
        { $inc: { amount: Number(transfertPaymentDto.amount) * -100 } },
      );
      return {
        statusCode: 200,
        message: 'API.AMOUNT_TRANSFERED',
      };
    } catch (err) {
      throw new HttpException(err, HttpStatus.METHOD_NOT_ALLOWED);
    }
  }

  async transfertPaymentDetails(page_size, page_number, user) {
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const { transfert_data, transfert_total } =
      await this.paymentService.transfertPaymentDetails(user._id, skip, limit);
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      data: transfert_data,
      total: transfert_total,
    };
  }

  async clientInvoice(
    page_size,
    page_number,
    search,
    user,
    from_date,
    to_date,
  ) {
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const { invoice_data, invoice_length } =
      await this.paymentService.clientInvoice(
        limit,
        skip,
        search,
        user,
        from_date,
        to_date,
      );
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      data: invoice_data,
      total: invoice_length,
    };
  }

  async exportClientInvoice(user, from_date, to_date) {
    const { invoice_data, invoice_length, invoice_length_data } =
      await this.paymentService.clientInvoice(
        1,
        1,
        '',
        user,
        from_date,
        to_date,
      );
      if (invoice_length_data.length == 0) {
        throw new HttpException('NO DATA ENTRY', HttpStatus.BAD_REQUEST);
      }
      // fetch pro data
      const pro_data = await this.userService.findUserBy({ _id: user._id });
      // export to pdf
      const { generatePdf } = require('../../shared/exportPdf');
      const file_name = await generatePdf(
        invoice_length_data,
        pro_data,
        pro_data,
        'client',
      );
      const upload_result = await this.userService.uploadPdf(file_name);
      const fs = require('fs');
      fs.unlinkSync(file_name);
      return {
        statusCode: 200,
        message: 'API.TRANSFERT_DETAILS',
        data: {
          url: upload_result.Location,
        },
      };
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      data: {
        url: 'https://beyang.s3.eu-central-1.amazonaws.com/AbonnemenT.pdf',
      },
    };
  }

  async exportSubInvoice(user, from_date, to_date) {
    const { sub_data, sub_total, sub_total_data } =
      await this.paymentService.fetchSubInvoice(
        1,
        1,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    if (sub_total_data.length == 0){
      throw new HttpException('NO DATA ENTRY', HttpStatus.BAD_REQUEST);
    }
      // fetch company data
      const company_data = await this.companyService.getCompanyByUserId(
        user._id,
      );
    // fetch pro data
    const pro_data = await this.userService.findUserBy({ _id: user._id });
    // export to pdf
    const { generatePdf } = require('../../shared/exportPdf');
    const file_name = await generatePdf(sub_total_data, company_data, pro_data , 'sub');
    const upload_result = await this.userService.uploadPdf(file_name)
    const fs =require("fs")
    fs.unlinkSync(file_name)
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      data: {
        url: upload_result.Location,
      },
    };
  }

  async exportEventInvoice(user, from_date, to_date) {
    const { event_data, event_total, event_total_data } =
      await this.paymentService.fetchEventInvoice(
        1,
        1,
        '',
        user,
        from_date,
        to_date,
        true,
      );
       if (event_total_data.length == 0) {
         throw new HttpException('NO DATA ENTRY', HttpStatus.BAD_REQUEST);
       }
       // fetch company data
       const company_data = await this.companyService.getCompanyByUserId(
         user._id,
       );
       // fetch pro data
       const pro_data = await this.userService.findUserBy({ _id: user._id });
       // export to pdf
       const { generatePdf } = require('../../shared/exportPdf');
       const file_name = await generatePdf(
         event_total_data,
         company_data,
         pro_data,
         'event',
       );
       const upload_result = await this.userService.uploadPdf(file_name);
       const fs = require('fs');
       fs.unlinkSync(file_name);
       return {
         statusCode: 200,
         message: 'API.TRANSFERT_DETAILS',
         data: {
           url: upload_result.Location,
         },
       };
    // export to pdf
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      data: {
        url: 'https://beyang.s3.eu-central-1.amazonaws.com/Evenement.pdf',
      },
    };
  }

  async exportEventPackInvoice(user, from_date, to_date) {
    const { eventPack_data, eventPack_total, eventPack_total_data } =
      await this.paymentService.fetchEventPackInvoice(
        1,
        1,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    if (eventPack_total_data.length == 0) {
      throw new HttpException('NO DATA ENTRY', HttpStatus.BAD_REQUEST);
    }
    // fetch company data
    const company_data = await this.companyService.getCompanyByUserId(user._id);
    // fetch pro data
    const pro_data = await this.userService.findUserBy({ _id: user._id });
    // export to pdf
    const { generatePdf } = require('../../shared/exportPdf');
    const file_name = await generatePdf(
      eventPack_total_data,
      company_data,
      pro_data,
      'packEvent',
    );
    const upload_result = await this.userService.uploadPdf(file_name);
    const fs = require('fs');
    fs.unlinkSync(file_name);
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      data: {
        url: upload_result.Location,
      },
    };
  }

  async exportAppointmentInvoice(user, from_date, to_date) {
    const { appointment_data, appointment_total, appointment_total_data } =
      await this.paymentService.fetchAppointmentInvoice(
        1,
        1,
        '',
        user,
        from_date,
        to_date,
        true,
      );
if (appointment_total_data.length == 0) {
      throw new HttpException('NO DATA ENTRY', HttpStatus.BAD_REQUEST);
    }
    // fetch company data
    const company_data = await this.companyService.getCompanyByUserId(user._id);
    // fetch pro data
    const pro_data = await this.userService.findUserBy({ _id: user._id });
    // export to pdf
    const { generatePdf } = require('../../shared/exportPdf');
    const file_name = await generatePdf(
      appointment_total_data,
      company_data,
      pro_data,
      'appointment',
    );
    const upload_result = await this.userService.uploadPdf(file_name);
    const fs = require('fs');
    fs.unlinkSync(file_name);
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      data: {
        url: upload_result.Location,
      },
    };

  }
  async updateAllWallets() {
      await this.walletModel.updateMany({amount:0})
  }

  async fetchStripeWallet(user) {
    /* fetch users */
    const user_data = await this.userService.findUserBy({_id:user._id})
    const Stripe = require("stripe")
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    const balance = await stripe.balance.retrieve({
    stripeAccount: user_data.stripe_account_id,
    });
    return {
      statusCode: 200,
      message: 'API.STRIPE_DETAILS',
      data: {available:balance.available[0],pending:balance.pending[0]}
    };
  }


  async fetchSubInvoiceForGlobalSearchPro(
    page_size,
    page_number,
    search,
    user,
  ) {
    const  from_date=new Date('2001-01-01').toISOString()
   const  to_date=new Date().toISOString()
    /* fetch data from payment */
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const { appointment_data, appointment_total } =
      await this.paymentService.fetchAppointmentInvoice(
        skip,
        limit,
        search,
        user,
        from_date,
        to_date,
        false,
      );
    const { eventPack_data, eventPack_total } =
      await this.paymentService.fetchEventPackInvoice(
        skip,
        limit,
        search,
        user,
        from_date,
        to_date,
        false,
      );
    const { event_data, event_total } =
      await this.paymentService.fetchEventInvoice(
        skip,
        limit,
        search,
        user,
        from_date,
        to_date,
        false,
      );
    const { sub_data, sub_total } = await this.paymentService.fetchSubInvoice(
      skip,
      limit,
      search,
      user,
      from_date,
      to_date,
      false,
    );
    const fac_length = sub_total+event_total+eventPack_total+appointment_total
    const fac_data = { appointment_data, sub_data, event_data, eventPack_data ,client_fac_data:null }
    return  { fac_data,fac_length }
      
    //TODO:To implement later
      
    
  }


  async fetchSubInvoiceForGlobalSearchClient(
    page_size,
    page_number,
    search,
    user,
  ) { 
    const skip = page_number && page_size ? (+page_number - 1) * +page_size : 0;
    const limit = page_number && page_size ? +page_size : 10;
    const  from_date=new Date('2001-01-01').toISOString()
    const  to_date=new Date().toISOString()
    const { invoice_data, invoice_length } =
      await this.paymentService.clientInvoice(
        limit,
        skip,
        search,
        user,
        from_date,
        to_date,
      );
    return {
      statusCode: 200,
      message: 'API.TRANSFERT_DETAILS',
      invoice_data,
      total: invoice_length,
    };

  }

}
