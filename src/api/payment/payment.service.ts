import { Model } from 'mongoose';
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  CreatePaymentSubDto,
  turnoverByProDto,
  createCouponDto,
} from './dto/create-payment-sub.dto';
import { Payment } from './schemas/payment.entity';
import { Relationship, User } from '../users/models/user.model';
import { Subscription } from '../../back-office/models/subscription.model';

import Stripe from 'stripe';
import mongoose from 'mongoose';
import { UsersService } from '../users/users.service';
import { PrestationService } from '../prestation/prestation.service';
import { CompanyService } from '../companies/company.service';
import { dynamicLink } from '../../shared/generateDynamicLink';
import {
  Appointment,
  AppointmentBusinessInstance,
  AppointmentInstance,
} from '../appointment/schemas/appointment.entity';
import { EventsPack } from '../eventspack/schemas/eventspack.entity';
import { Events, TheNext } from '../events/schemas/event.entity';
import { EventsMembers } from '../events/schemas/eventMembers.entity';

import {
  APPOINTEMNT_DEMANDE_FOR_PRO,
  NEW_SIGNUP_EVENT,
  QUOTATION_ACCEPTED_FOR_PRO,
  tags,
} from 'src/constantes/constantes';
import { Quotation } from '../quotation/model/model.quotation';
import { notifTag } from 'src/shared/enums';
import {
  canPass,
  dataPayload,
  NotificationMessage,
  onNotify,
} from 'src/shared/notif.class';
import { NotificationService } from '../notifications/notification.service';
import * as moment from 'moment';
import { UserToken } from 'src/shared/tokenModel';
import { app } from 'firebase-admin';
import { Coupon } from './schemas/coupons.entity';
import { FetchDiscounts } from './dto/fetch-all-discounts.dto';
import { getLastDayOfMonth } from 'src/shared/lastDayInMounth';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(TheNext.name) private thnextModel: Model<TheNext>,
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
    @InjectModel(Events.name) private eventsModel: Model<Events>,
    @InjectModel(EventsPack.name) private eventsPackModel: Model<EventsPack>,
    @InjectModel(Quotation.name) private quotationModel: Model<Quotation>,
    @InjectModel(EventsMembers.name)
    private eventsMembersModel: Model<EventsMembers>,

    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(AppointmentInstance.name)
    private AppointmentInstanceModel: Model<AppointmentInstance>,

    @InjectModel(AppointmentBusinessInstance.name)
    private AppointmentBusinessInstanceModel: Model<AppointmentBusinessInstance>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Relationship.name)
    private readonly relationshipsModel: Model<Relationship>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    private readonly prestationService: PrestationService,
    private readonly notificationService: NotificationService,
    private readonly companyService: CompanyService,
  ) {}

  findStripeFees(fees) {
    return fees.find((fee) => fee.type == 'stripe_fee');
  }

  async createRefund(
    paymentIntent,
    paymentId,
    amount,
    return_fees?,
    from_client?,
  ) {
    const payment_data = await this.paymentModel.findOne({ _id: paymentId });
    let stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
      stripeAccount: payment_data.stripe_data.account,
    });
    const fetch_intent_data = await stripe.paymentIntents.retrieve(
      paymentIntent,
      {
        expand: ['latest_charge.balance_transaction'],
      },
    );
    const stripe_fees = this.findStripeFees(
      fetch_intent_data['latest_charge'].balance_transaction.fee_details,
    );
    if (from_client == true) amount = amount - stripe_fees?.amount;
    const refund = await stripe.refunds.create({
      amount,
      payment_intent: paymentIntent,
    });
    if (return_fees == true && payment_data.stripe_data.account) {
      const charge = await stripe.charges.retrieve(
        payment_data.stripe_data['data']['object']['latest_charge'],
      );
      stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });
      await stripe.applicationFees.createRefund(
        String(charge?.application_fee),
      );
    }
    await this.paymentModel.findOneAndUpdate(
      { _id: paymentId },
      { status: 'Refunded', stripe_data: refund },
    );

    return 'refund generated';
  }

  async createRefundAmount(paymentIntent, paymentId, amount, no_show?) {
    const payment_data = await this.paymentModel.findOne({ _id: paymentId });
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
      stripeAccount: payment_data.stripe_data.account,
    });
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent,
      amount,
    });
    let update_payment = await this.paymentModel
      .findOneAndUpdate(
        { _id: paymentId._id },
        { status: 'Refunded', stripe_data: refund, amount },
      )
      .lean();
    update_payment.amount = update_payment.amount * 0.3;
    update_payment.status = 'Success';
    delete update_payment._id;
    delete update_payment['createdAt'];
    delete update_payment['updatedAt'];
    if (no_show) {
      const result = await this.paymentModel.create(update_payment);
    }
    return 'refund generated';
  }

  async createPaymentIntent(createPaymentDto: CreatePaymentDto, user) {
    /* check user capability*/
    if (createPaymentDto.eventPackId) {
      /* check user capability*/
      const user_data = await this.userModel.findOne({
        _id: user._id,
        subscription_expiration_date: { $gte: new Date().toISOString() },
      });
      if (!user_data)
        throw new HttpException('Subscription expired', HttpStatus.FORBIDDEN);
    }
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    try {
      let {
        eventId,
        prestationId,
        to,
        assigned_employees,
        eventPackId,
        is_online,
        quotationId,
      } = createPaymentDto;
      const appointmentId = prestationId;
      const startDate = new Date(String(createPaymentDto.startDate));
      const userData = await this.userModel.findOne({ _id: user._id });
      if (!userData.stripe_customer_id) {
        userData.stripe_customer_id = (
          await stripe.customers.create({ email: userData.email })
        ).id;
        await userData.save();
      }
      let companyData;
      if (to)
        companyData = await this.companyService.getCompanyByUserId(String(to));
      let toData;
      if (to) toData = await this.userModel.findOne({ _id: to });
      let type: string;
      let amount = 0;
      let prestation_duration = 0;
      let duration_without_break = 0;
      /* Create payment Intent */
      if (eventPackId) {
        // TODO : implement event payment when it's ready
        type = 'EventPack';
        /* fetch the event pack data */
        const events_pack_data = await this.eventsPackModel.findOne({
          _id: eventPackId,
        });
        amount = events_pack_data.price;
      }
      if (eventId) {
        type = 'Event';
        /* fetch the event data */
        const event_data = await this.eventsModel.findOne({ _id: eventId });
        toData = await this.userModel.findOne({ _id: event_data['owner'] });
        to = event_data['owner'];
        if (is_online == true) amount = event_data.price_on_line;
        else amount = event_data.price_face_to_face;
        /* create event member */
        const event_member = await this.eventsMembersModel.findOneAndUpdate(
          { userId: user._id, eventId },
          { online: is_online },
          { new: true, upsert: true },
        );
      }
      const _id = new mongoose.Types.ObjectId();
      let created_appointment_id = null;
      let appointmentInstace;
      let multi_business = false;
      let at_home = false;
      let at_business = false;
      let online = false;
      let appointmentId_mapped = [];
      let participantsNumber = 0;
      if (appointmentId) {
        type = 'Job';
        appointmentId_mapped = appointmentId.map(
          (appointment) => appointment.prestationId,
        );
        let fetch_appointments = await this.prestationService.findWithQuery({
          _id: { $in: appointmentId_mapped },
        });
        for (let i = 0; i < fetch_appointments.length; i++) {
          if (i == 0) {
            console.log(Number(companyData['break_duration_in_minutes']));
            prestation_duration += Number(
              companyData['break_duration_in_minutes'],
            );
            console.log(prestation_duration);
          }
          if (appointmentId[i]['at_home'] == true) {
            amount += Number(fetch_appointments[i]['fee_at_home']) * 100;
            amount = parseInt(String(amount));
            at_home = true;
          }
          if (appointmentId[i]['at_business'] == true) {
            amount += Number(fetch_appointments[i]['fee']) * 100;
            amount = parseInt(String(amount));
            at_business = true;
            if (
              fetch_appointments[i]['participants_at_busniness'] == true &&
              createPaymentDto.prestationId[0].online == false
            )
              multi_business = true;
          }
          if (
            appointmentId[i]['online'] == true &&
            createPaymentDto.prestationId[0].online == true
          ) {
            amount += Number(fetch_appointments[i]['fee_online'] * 100);
            amount = parseInt(String(amount));
            online = true;
          }
          prestation_duration += Number(fetch_appointments[i]['duration']);
          duration_without_break += Number(fetch_appointments[i]['duration']);
          if (createPaymentDto.prestationId[0].online == true)
            participantsNumber += Number(
              fetch_appointments[i]['participantsNumber'],
            );
          else {
            if (fetch_appointments[i]['participants_at_busniness'] == true)
              participantsNumber += Number(
                fetch_appointments[i]['participantsNumber_at_busniness'],
              );
          }
        }
        /* check if the users already took and appointment */
        const check = await this.appointmentModel.findOne({
          start_date: {
            $gte: startDate,
            $lte: new Date(startDate.getTime() + prestation_duration * 60000),
          },
          end_date: {
            $gte: startDate,
            $lte: new Date(startDate.getTime() + prestation_duration * 60000),
          },
          from: user._id,
          to,
          company: toData['relatedCompany'],
          prestations: appointmentId_mapped,
          duration: prestation_duration,
          total_amount: amount,
          at_home,
          at_business,
          online,
          multi_business,
          $or: [{ status: 'Accepted' }, { status: 'Pending' }],
        });
        if (check?.['active'] == true)
          /* throw error */
          throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

        if (appointmentId[0]['participants_at_busniness'] == true) {
          multi_business = true;
        }

        const created_appointment =
          await this.appointmentModel.findOneAndUpdate(
            {
              start_date: startDate,
              end_date: new Date(
                startDate.getTime() + prestation_duration * 60000,
              ),
              from: user._id,
              to,
              company: toData['relatedCompany'],
              //payment_id: _id,
              prestations: appointmentId_mapped,
              duration: prestation_duration,
              total_amount: amount,
              assigned_employees: assigned_employees ? assigned_employees : [],
              appointmentInstance: appointmentInstace
                ? appointmentInstace['_id']
                : null,
              at_home,
              at_business,
              online,
              duration_without_break,
              break: Number(companyData['break_duration_in_minutes']),
              participantsNumber,
              status: 'Pending',
              multi_business,
            },
            { payment_id: _id },
            { upsert: true, new: true },
          );
        // const created_appointment = await this.appointmentModel.create({
        //   start_date: startDate,
        //   end_date: new Date(startDate.getTime() + prestation_duration * 60000),
        //   from: user._id,
        //   to,
        //   company: toData['relatedCompany'],
        //   payment_id: _id,
        //   prestations: appointmentId_mapped,
        //   duration: prestation_duration,
        //   total_amount: amount,
        //   assigned_employees,
        //   appointmentInstance: appointmentInstace
        //     ? appointmentInstace['_id']
        //     : null,
        //   at_home,
        //   at_business,
        //   online,
        // });
        created_appointment_id = String(created_appointment._id);
      }
      let payment_object;
      let stripeAccount = null;
      if (type == 'Job' || type == 'Event') {
        stripeAccount = toData.stripe_account_id;
        payment_object = {
          amount: appointmentId || eventId ? amount + 100 : amount,
          currency: 'eur',
          payment_method_types: ['card'],
          application_fee_amount: 100,
          metadata: {
            uid: String(_id),
            appointmentId: created_appointment_id,
            eventPackId: eventPackId ? String(eventPackId) : null,
            userId: String(user._id),
            eventId: String(eventId),
            quotationId: String(quotationId),
          },
          receipt_email: userData.email,
        };
      } else {
        payment_object = {
          amount: appointmentId || eventId ? amount + 100 : amount,
          currency: 'eur',
          payment_method_types: ['card'],
          metadata: {
            uid: String(_id),
            appointmentId: created_appointment_id,
            eventPackId: eventPackId ? String(eventPackId) : null,
            userId: String(user._id),
            eventId: String(eventId),
            quotationId: String(quotationId),
          },
          receipt_email: userData.email,
          customer: userData.stripe_customer_id,
        };
      }

      const paymentIntent = await stripe.paymentIntents.create(payment_object, {
        stripeAccount: stripeAccount,
      });
      /* Save to DB */
      const data = await this.paymentModel.create({
        _id,
        from: user._id,
        to,
        amount: paymentIntent['amount'],
        type,
        stripe_data: paymentIntent,
        eventId,
        appointmentId: created_appointment_id,
        eventPackId,
      });
      return {
        statusCode: 201,
        message: 'API.PAYMENT_INTENT_GENERATED',
        data: paymentIntent,
        stripeAccount,
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  async createPaymentSub(createPaymentSubDto: CreatePaymentSubDto) {
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    /* check if the user has a customer id */
    let user = await this.userModel.findOne({
      _id: createPaymentSubDto.userId,
    });
    if (!user.stripe_customer_id) {
      /* create a customer */
      const customer = await stripe.customers.create({
        email: user.email,
      });
      user.stripe_customer_id = customer.id;
      await user.save();
    }
    const _id = new mongoose.Types.ObjectId();
    /* fetch the sub price */
    const subscription = await this.subscriptionModel.findOne({
      _id: createPaymentSubDto.subId,
    });

    /* handle if the user has taken a free tier else */
    if (subscription.monthly_payment == 0 && subscription.yearly_payment == 0) {
      let subscription_expiration_date = new Date();
      subscription_expiration_date.setDate(
        subscription_expiration_date.getDate() + 14,
      );
      await this.paymentModel.create({
        _id,
        from: createPaymentSubDto.userId, // will be fetched from token
        amount: 0, // wil be fetched depending on the requested goods
        type: 'Subscription', // will be fetched depending on the requested type
        subId: createPaymentSubDto.subId,
        status: 'Success',
        expiration_date: subscription_expiration_date,
        extra: createPaymentSubDto.extra,
      });

      await this.userModel.findOneAndUpdate(
        { _id: createPaymentSubDto.userId },
        {
          subscription_expiration_date,
          subscription: createPaymentSubDto.subId,
        },
      );
      //! create the next to notifier
      await this.thnextModel.findOneAndUpdate(
        {
          toNotif: user._id,
          comparativeDate: subscription_expiration_date,
          type: 'subscription',
        },
        {
          toNotif: user._id,
          soonInD: Math.abs(
            moment().diff(subscription_expiration_date, 'days'),
          ),
          comparativeDate: subscription_expiration_date,
          type: 'subscription',
        },
        { upsert: true, new: true },
      );
      return {
        successCode: 201,
        message: 'API.PAYMENT_INTENT_ACCEPTED',
      };
    }
    /*************************************************/
    let priceId = [];
    let price: number;
    let extras = createPaymentSubDto.extra;
    if (createPaymentSubDto.type == 'MONTHLY') {
      priceId.push({ price: subscription.monthly_payment_id });
      price = subscription.monthly_payment;
      if (extras) {
        priceId.push({ price: subscription.monthly_payment_with_extra_id });
        price += subscription.monthly_payment_extras;
      }
    } else {
      priceId.push({ price: subscription.yearly_payment_id });
      price = subscription.yearly_payment;
      if (extras) {
        priceId.push({ price: subscription.yearly_payment_with_extra_id });
        price += subscription.yearly_payment_extras;
      }
    }

    let team_size: string = String(subscription.availabe_team);
    let team_unlimited: string;
    for (let i = 0; i < subscription.dimensionnement.length; i++) {
      if (subscription.dimensionnement[i].pricing_monthly == 0) continue;
      if (extras == true) {
        team_size = String(subscription.dimensionnement[i].team_size);
        team_unlimited = String(
          subscription.dimensionnement[i]['team_unlimited'],
        );
      }
    }
    /* create the subscription intent */
    const subscription_stripe = await stripe.subscriptions.create({
      customer: user.stripe_customer_id,
      items: priceId,
      payment_settings: {
        payment_method_types: ['card'],
      },
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      coupon: createPaymentSubDto.coupon ? createPaymentSubDto.coupon : null,
      metadata: {
        uid: String(_id),
        extras: String(extras),
        team_unlimited,
        team_size,
      },
    });

    if (subscription_stripe.latest_invoice['amount_due'] == '0') {
      let months_to_add;
      let subscription_expiration_date;
      if (createPaymentSubDto.type == 'MONTHLY') months_to_add = 1;
      else {
        months_to_add = 12;
      }
      subscription_expiration_date = new Date();
      subscription_expiration_date.setMonth(
        subscription_expiration_date.getMonth() + months_to_add,
      );
      let team_size: string = String(subscription.availabe_team);
      let team_unlimited ;
      for (let i = 0; i < subscription.dimensionnement.length; i++) {
        if (subscription.dimensionnement[i].pricing_monthly == 0) continue;
        if (extras == true) {
          team_size = String(subscription.dimensionnement[i].team_size);
          team_unlimited = String(
            subscription.dimensionnement[i]['team_unlimited'],
          ) == 'undefined' ? 'false' : String(subscription.dimensionnement[i]['team_unlimited']) ;
        }
      }
      await this.paymentModel.create({
        _id,
        from: createPaymentSubDto.userId, // will be fetched from token
        amount: 0, // wil be fetched depending on the requested goods
        type: 'Subscription', // will be fetched depending on the requested type
        subId: createPaymentSubDto.subId,
        status: 'Success',
        expiration_date: subscription_expiration_date,
        extra: createPaymentSubDto.extra,
        subLength: createPaymentSubDto.type,
      });

      await this.thnextModel.deleteMany({
        toNotif: user._id,
        type: 'subscription',
      });

      await this.userModel.findOneAndUpdate(
        { _id: createPaymentSubDto.userId },
        {
          available_team_members:team_size,
          unlimited_team_members:team_unlimited,
          payed_extras: createPaymentSubDto.extra,
          subscription_expiration_date,
          subscription_start_date: new Date().toISOString(),
          subscription: createPaymentSubDto.subId,
        },
      );
    } else
      await this.paymentModel.create({
        _id,
        from: createPaymentSubDto.userId, // will be fetched from token
        amount: subscription_stripe['latest_invoice']['total'], // wil be fetched depending on the requested goods
        type: 'Subscription', // will be fetched depending on the requested type
        stripe_data: subscription_stripe,
        subId: createPaymentSubDto.subId,
        subLength: createPaymentSubDto.type,
        extra: createPaymentSubDto.extra,
      });

    if (subscription_stripe['latest_invoice']['total'] == 0) {
      return {
        successCode: 201,
        message: 'API.PAYMENT_INTENT_ACCEPTED',
      };
    }
    return {
      successCode: 201,
      message: 'API.PAYMENT_INTENT_ACCEPTED',
      data: subscription_stripe,
    };
  }

  async paymentWebhook(data: any) {
    try {
      if (data.type == 'payment_intent.succeeded') {
        let array_promise = [];
        const { userId, eventPackId, eventId, uid } = data.data.object.metadata;
        let appointment_data;
        const appId = data.data.object.metadata.appointmentId;
        const evId = data.data.object.metadata.eventId;
        const qId = data.data.object.metadata.quotationId;
        let pass = false;
        console.log(appId, typeof appId, ' : app');
        console.log(evId, typeof evId, ': ev');
        console.log(qId, typeof qId, ' :q');

        array_promise.push(
          this.paymentModel.findOneAndUpdate(
            { _id: data.data.object.metadata.uid },
            { status: 'Success', stripe_data: data },
          ),
        );

        if (evId && evId != 'undefined' && evId != undefined) {
          array_promise.push(
            this.eventsMembersModel.findOneAndUpdate(
              { eventId, userId },
              { status: 'Accepted', paymentId: uid },
            ),
          );
          //! notification new event signup
          pass = true;
        }
        if (
          data.data.object.metadata.eventPackId &&
          data.data.object.metadata.eventPackId != 'undefined' &&
          data.data.object.metadata.eventPackId != undefined
        ) {
          const eventPackData = await this.eventsPackModel.findOne({
            _id: eventPackId,
          });
          array_promise.push(
            this.userModel.findOneAndUpdate(
              { _id: userId },
              { $inc: { available_events: eventPackData.number_of_events } },
            ),
          );
          pass = true;
        }
        //todo heeeeeeeeeeeeeeeeeeeeeer
        if (appId && appId != 'undefined' && appId != undefined) {
          /*get the pro id */
          
          appointment_data = await this.appointmentModel.findOneAndUpdate(
              {
                _id: appId,
              },
              { active: true },
              { timestamps: false },
            ),
          
          array_promise.push(
            this.userModel.findOneAndUpdate(
              { _id: appointment_data.to },
              { $inc: { total_appointments: 1 } },
            ),
          );
          pass = true;

          //  //! notification new demand appointment signup
        }

        console.log(qId && qId != 'undefined' && qId != undefined);
        console.log(qId && qId != 'undefined');
        if (qId && qId != 'undefined' && qId != undefined) {
          array_promise.push(
            this.quotationModel.findOneAndUpdate(
              {
                _id: qId,
              },
              { appointment_taken: true },
            ),
          );
          pass = true;
        }

        const resolved = await Promise.all(array_promise);

        if (qId && resolved && qId != 'undefined' && qId != undefined && pass) {
          const quotation = await this.quotationModel.findOne({ _id: qId });
          const from = await this.userModel.findOne({ _id: quotation.from });
          const to = await this.userModel.findOne({ _id: quotation.to });
          let message: NotificationMessage = {
            data: dataPayload({
              tag: notifTag.QUOTATION_ACCEPTED_FOR_PRO,
              firstName: from.firstName,
              lastName: from.lastName,
              companyName: from.companyName,
              //start_date: quotation['createdAt'].toISOString(),
              badge: await this.notificationService.badge(to._id),
              num_quo: quotation.num_quo.toString(),
              start_date: new Date(quotation['updatedAt']).toISOString(),
            }),

            notification: QUOTATION_ACCEPTED_FOR_PRO(
              await this.notificationService.badge(to._id),
            ),
          };

          await onNotify(from, to, this.notificationService, message);
        }

        if (
          appId &&
          appId != 'undefined' &&
          appId != undefined &&
          resolved &&
          pass
        ) {
          const app = await this.appointmentModel
            .findOne({ _id: appId })
            .populate(['to', 'from']);

          let message: NotificationMessage = {
            data: dataPayload({
              tag: notifTag.APPOINTEMNT_DEMANDE_FOR_PRO,
              firstName: app.from.firstName,
              lastName: app.from.lastName,
              start_date: app.start_date ? app.start_date.toISOString() : '',
              badge: await this.notificationService.badge(app.to._id),
            }),
            notification: APPOINTEMNT_DEMANDE_FOR_PRO(
              await this.notificationService.badge(app.to._id),
            ),
          };
          if (new Date(app.start_date).getDay() === 1) {
            await this.thnextModel.findOneAndUpdate(
              {
                toNotif: app.to._id,
                appointment: app._id,
                notifPayload: app.from._id,
                comparativeDate: app.start_date,
                type: 'appointment',
                fridayNodif: true,
              },
              {
                toNotif: app.to._id,
                appointment: app._id,
                notifPayload: app.from._id,
                soonInD: Math.abs(moment().diff(app.start_date, 'days')),
                soonInH: Math.abs(moment().diff(app.start_date, 'hours')),
                comparativeDate: app.start_date,
                type: 'appointment',
                soonInM: Math.abs(moment().diff(app.start_date, 'minutes')),
                fridayNodif: true,
              },
              { upsert: true, new: true },
            );
            await this.thnextModel.findOneAndUpdate(
              {
                toNotif: app.from._id,
                appointment: app._id,
                notifPayload: app.to._id,

                comparativeDate: app.start_date,
                type: 'appointment',
                fridayNodif: true,
              },
              {
                toNotif: app.from._id,
                appointment: app._id,
                notifPayload: app.to._id,
                soonInD: Math.abs(moment().diff(app.start_date, 'days')),
                soonInH: Math.abs(moment().diff(app.start_date, 'hours')),
                comparativeDate: app.start_date,
                type: 'appointment',
                soonInM: Math.abs(moment().diff(app.start_date, 'minutes')),
                fridayNodif: true,
              },
              { upsert: true, new: true },
            );
          }
          await onNotify(app.from, app.to, this.notificationService, message);
          //!to app
          if (new Date(app.start_date).getDay() !== 1) {
            await this.thnextModel.findOneAndUpdate(
              {
                toNotif: app.to._id,
                appointment: app._id,
                notifPayload: app.from._id,
                comparativeDate: app.start_date,
                type: 'appointment',
                fridayNodif: false,
              },
              {
                toNotif: app.to._id,
                appointment: app._id,
                notifPayload: app.from._id,
                soonInH: Math.abs(moment().diff(app.start_date, 'hours')),
                comparativeDate: app.start_date,
                type: 'appointment',
                soonInM: Math.abs(moment().diff(app.start_date, 'minutes')),
                fridayNodif: false,
              },
              { upsert: true, new: true },
            );
            await this.thnextModel.findOneAndUpdate(
              {
                toNotif: app.from._id,
                appointment: app._id,
                notifPayload: app.to._id,
                comparativeDate: app.start_date,
                type: 'appointment',
                fridayNodif: false,
              },
              {
                toNotif: app.from._id,
                appointment: app._id,
                notifPayload: app.to._id,
                soonInH: Math.abs(moment().diff(app.start_date, 'hours')),
                comparativeDate: app.start_date,
                type: 'appointment',
                soonInM: Math.abs(moment().diff(app.start_date, 'minutes')),
                fridayNodif: false,
              },
              { upsert: true, new: true },
            );
          }

          //**************************************************************************** */
        } else if (
          evId &&
          evId != 'undefined' &&
          evId != undefined &&
          resolved &&
          pass
        ) {
          //todo  get the participant...
          const event = await this.eventsModel.findOne({
            _id: evId,
          });
          //
          const participation = await this.eventsMembersModel
            .find({
              eventId: evId,
            })
            .sort({ createdAt: -1 });
          console.log('partisipation liste', participation);
          //
          const participant = await this.userModel.findOne({
            _id: participation[0].userId,
          });
          const userOwner = await this.userModel.findOne({ _id: event.owner });
          // let isViseo = '';
          // if (
          //   event.on_line.toString() == 'true' &&
          //   event.face_to_face.toString() == 'true'
          // ) {
          //   isViseo = 'true';
          // }

          // if (event.on_line.toString() == 'true') {
          //   isViseo = 'true';
          // }
          // if (event.on_line.toString() == 'false') {
          //   isViseo = 'false';
          // }

          let message: NotificationMessage = {
            data: dataPayload({
              tag: notifTag.NEW_SIGNUP_EVENT,
              firstName: participant.firstName,
              lastName: participant.lastName,
              eventId: event._id.toString(),
              start_date: event.start_date.toISOString(),
              eventName: event.event_name,
              badge: await this.notificationService.badge(userOwner._id),
              isViseo: participation[0]['online'].toString(),
            }),
            notification: NEW_SIGNUP_EVENT(
              await this.notificationService.badge(userOwner._id),
            ),
          };

          await onNotify(
            participant,
            userOwner,
            this.notificationService,
            message,
          );
          await this.thnextModel.findOneAndUpdate(
            {
              toNotif: participation[0]?.userId,
              comparativeDate: event?.start_date,
              type: 'event',
            },
            {
              event:event._id.toString(),
              toNotif: participation[0]?.userId,
              soonInH: Math.abs(moment().diff(event?.start_date, 'hours')),
              comparativeDate: event?.start_date,
              soonInD: Math.abs(moment().diff(event?.start_date, 'days')),
              type: 'event',
              soonInM: Math.abs(moment().diff(event?.start_date, 'minutes')),
            },
            { upsert: true, new: true },
          );
          //************************************************************************** */
        }

        return {
          successCode: 201,
          message: 'API.PAYMENT_INTENT_ACCEPTED',
          data,
        };
      }

      if (data.type == 'charge.refunded') {
        await this.paymentModel.findOneAndUpdate(
          {
            _id: data.data.object.metadata.uid,
          },
          { status: 'Refunded', stripe_data: data },
        );
        return { statusCode: 200, message: 'API.PAYMENT_REFUNDED', data };
      }
      /* function to search where the metadata is */
      if (data.type == 'invoice.payment_succeeded') {
        data.data.object.lines.data[0].metadata = this.searchMetadata(
          data.data.object.lines.data,
        );
        let payment_data = await this.paymentModel.findOne({
          _id: data.data.object.lines.data[0].metadata.uid,
        });
        let events_to_add = 0;
        let user_data = await this.userModel
          .findOne({ _id: payment_data.from })
          .lean();
        if (user_data?.took_signup_events != true) {
          events_to_add += 10;
          user_data.available_events += events_to_add;
          user_data.took_signup_events = true;
        }
        let months_to_add;
        /* fetch user info */
        console.log(data.data.object.lines.data);
        if (payment_data.subLength == 'MONTHLY') months_to_add = 1;
        else months_to_add = 12;
        let subscription_expiration_date = new Date();
        subscription_expiration_date.setMonth(
          subscription_expiration_date.getMonth() + months_to_add,
        );
        let payment_result;

        if (payment_data.status == 'Pending') {
          payment_result = await this.paymentModel.findOneAndUpdate(
            {
              _id: data.data.object.lines.data[0].metadata.uid,
            },
            {
              status: 'Success',
              stripe_data: data,
              expiration_date: subscription_expiration_date,
            },
          );
        } else {
          delete payment_data._id;
          delete payment_data['expiration_date'];
          payment_result = await this.paymentModel.create({
            ...payment_data,
            stripe_data: data,
            expiration_date: subscription_expiration_date,
          });
        }

        await this.userModel.findOneAndUpdate(
          { _id: payment_result.from },
          {
            available_events: user_data.available_events,
            took_signup_events: user_data.took_signup_events,
            subscription: payment_result.subId,
            subscription_expiration_date,
            subscription_start_date: new Date(),
            available_team_members: Number(
              data.data.object.lines.data[0].metadata.team_size,
            ),
            unlimited_team_members: Boolean(
              data.data.object.lines.data[0].metadata.team_unlimited,
            ),
            payed_extras: data.data.object.lines.data[0].metadata.extras,
          },
        );
        return { statusCode: 200, message: 'API.PAYMENT_REFUNDED', data };
      }
    } catch (e) {
      console.log(e);
      return { statusCode: 200, message: e };
      //throw new HttpException('notif', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  searchMetadata(payload) {
    for (let i = 0; i < payload.length; i++) {
      if (Object.keys(payload[i].metadata).length != 0)
        return payload[i].metadata;
    }
  }

  async connectWithStripe(query, res) {
    console.log(query);
    if (process.env.NODE_ENV == 'dev') {
      if (query.ended == 'true')
        return res.redirect(302, `${process.env.REDIRECT}`);
      else
        return res.redirect(
          302,
          `${process.env.SERVER_URI_CONNECT}?ended=true`,
        );
    }
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    if (query.failed == 'true') {
      const accountLink = await stripe.accountLinks.create({
        account: query.acc_id,
        refresh_url: `${process.env.SERVER_URI_CONNECT}?acc_id=${query.acc_id}&id=${query.id}&failed=true`,
        return_url: `${process.env.SERVER_URI_CONNECT}?acc_id=${query.acc_id}&id=${query.id}`,
        type: 'account_onboarding',
      });
      return res.redirect(302, `${accountLink.url}`);
    }
    await this.userModel.findOneAndUpdate(
      { _id: query.id },
      { stripe_account_id: query.acc_id },
    );
    const account = await stripe.accounts.update(query.acc_id, {
      settings: { payouts: { schedule: { interval: 'manual' } } },
    });
    return res.redirect(302, `${process.env.REDIRECT}`);
    // const { state, code, error } = query;
    // console.log(query);
    // if (error) return res.redirect(302, `${process.env.REDIRECT_FAILED}`);
    // const stripe = new Stripe(process.env.STRIPE, {
    //   apiVersion: '2022-08-01',
    // });
    // /* finish auth with stripe */
    // try {
    //   let connect = await stripe.oauth.token({
    //     grant_type: 'authorization_code',
    //     code,
    //   });
    //   if (process.env.NODE_ENV == "dev")
    //     connect.stripe_user_id = "acct_1LUo36LtIjy25pof"
    //     /* save data to user */
    //   await this.userModel.findOneAndUpdate(
    //     { _id: state },
    //     {
    //       stripe_account_id: connect.stripe_user_id,
    //       stripe_account_data: connect,
    //     },
    //   );

    //   await this.userModel.findOneAndUpdate(
    //     { _id: state, configurationLevel: { $lt: 12 } },
    //     { configurationLevel: 10 },
    //   );
    // try{
    //   const account = await stripe.accounts.update(
    //     connect.stripe_user_id,
    //     {settings: {payouts: {schedule: {interval: 'manual'}}}}
    //   );
    // }catch(e){
    //   return res.redirect(302, `${process.env.REDIRECT}`);
    // }
    //   // await this.usersService.updateServices(state, {
    //   //   configurationLevel: 11,
    //   // });
    //   console.log('done');
    //   return res.redirect(302, `${process.env.REDIRECT}`);
    //   return { statusCode: 200, message: 'API.USER_CONNECTED' };
    // } catch (error: unknown) {
    //   console.log(error);
    //   return { statusCode: 402, message: 'API.FORBIDEN' };
    // }
  }

  async findAll() {
    return await dynamicLink(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'token',
      'reset-password',
    );
    return `This action returns all payment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }

  async getAllPayement(subLength, subId, priceToUpdate) {
    console.log(priceToUpdate, subId, subLength);

    let payments = await this.paymentModel.find({
      // subLength means duration , subId is the subscription id from mongodb, priceToUpdate is the stripe price id stored in mongo
      $and: [
        { status: 'Success' },
        { type: 'Subscription' },
        { subLength: subLength },
        { subId: subId },
        { 'stripe_data.data.object.lines.data.0.plan.id': priceToUpdate },
      ],
    });
    // console.log(payments.map(
    //   (payment) => payment._id
    // ));
    // console.log(payments.filter((element) => {
    //   //  console.log(element);

    //     return element.stripe_data.data.object.lines.data[0].plan.id.toString()=='sub_1MmIzOAjRu3zL9rvEBeTCNwc'&&element.stripe_data.data.object.lines.data[0].plan.id.toString()=='sub_1MsjKQAjRu3zL9rvtXyScCHS';
    //   }));

    return payments;
  }

  async updatePayementAmount(priceIdToUpdate, amount) {
    let payments = await this.paymentModel.findByIdAndUpdate(
      { _id: priceIdToUpdate },
      { amount },
      { new: true },
    );
    return payments;
  }

  async transfertPayment(amount, destination) {
    return new Promise(async (resolve, reject) => {
      const { _id, stripe_account_id } = destination;
      const stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });
      try {
        const transfer = await stripe.payouts.create(
          {
            amount: amount,
            currency: 'eur',
          },
          {
            stripeAccount: stripe_account_id,
          },
        );

        await this.paymentModel.create({
          to: _id,
          amount,
          stripe_data: transfer,
          type: 'Transfert',
          status: 'Success',
        });
        return resolve('Done');
      } catch (err) {
        console.log(err);
        return reject(err.raw.message);
      }
    });
  }

  async deleteSub(user) {
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    let sub_data = await this.paymentModel
      .findOne({
        from: user._id,
        type: 'Subscription',
        status: 'Success',
        amount: { $ne: 0 },
      })
      .sort({ updatedAt: -1 })
      .lean();
    if (sub_data) {
      const sub_id = sub_data.stripe_data.data.object.subscription;
      const sub = await stripe.subscriptions.retrieve(sub_id);
      if (sub.status == 'active') {
        const res = await stripe.subscriptions.del(sub_id, { prorate: true });
      }
    }
  }

  async fetchWithAggregate(query) {
    return await this.paymentModel.aggregate(query);
  }

  async updateSubscription(createPaymentSubDto) {
    const { userId, subId } = createPaymentSubDto;
    /* fetch the user data */
    const user_data = await this.userModel.findOne({ _id: userId });
    /* fetch the sub data of client */
    let sub_data = await this.paymentModel
      .findOne({
        from: userId,
        type: 'Subscription',
        status: 'Success',
        amount: { $ne: 0 },
      })
      .sort({ updatedAt: -1 })
      .lean();

    if (!sub_data) return this.createPaymentSub(createPaymentSubDto);
    if (
      sub_data.subId == subId &&
      sub_data.subLength == createPaymentSubDto.type &&
      sub_data['extra'] == createPaymentSubDto.extra
    )
      throw new HttpException('sub already exists', HttpStatus.BAD_REQUEST);
    /* extract the sub id */
    let priceId = [];
    let price: number;
    let extras = createPaymentSubDto.extra;
    let subscription = await this.subscriptionModel.findOne({
      _id: createPaymentSubDto.subId,
    });
    if (createPaymentSubDto.type == 'MONTHLY') {
      priceId.push({ price: subscription.monthly_payment_id });
      price = subscription.monthly_payment;
      if (extras) {
        priceId.push({ price: subscription.monthly_payment_with_extra_id });
        price += subscription.monthly_payment_extras;
      }
    } else {
      priceId.push({ price: subscription.yearly_payment_id });
      price = subscription.yearly_payment;
      if (extras) {
        priceId.push({ price: subscription.yearly_payment_with_extra_id });
        price += subscription.yearly_payment_extras;
      }
    }
    //const sub_id = 'sub_1MECE1AjRu3zL9rvhKlBpZjy';
    const sub_id = sub_data.stripe_data.data.object.subscription;
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    const sub = await stripe.subscriptions.retrieve(sub_id);
    // if (
    //   sub_data.subId['_id'] == createPaymentSubDto.subId &&
    //   createPaymentSubDto.type == sub_data.subLength
    // )
    //   priceId[0].id = sub.items.data[0].id;
    // /* fetch the customer payments */
    const paymentMethods = await stripe.customers.listPaymentMethods(
      user_data.stripe_customer_id,
      { type: 'card' },
    );
    if (sub.status == 'active')
      await stripe.subscriptions.del(sub_id, { prorate: true });
    const check_on_payment = await this.paymentModel
      .findOne({
        from: userId,
        subId,
        extra: createPaymentSubDto.extra,
        subLength: createPaymentSubDto.type,
        status: 'Pending',
      })
      .sort({ createdAt: -1 });
    if (check_on_payment) {
      if (check_on_payment.amount < price){
        return {
          successCode: 201,
          message: 'API.PAYMENT_INTENT_ACCEPTED',
          data: check_on_payment.stripe_data,
        };
      }
    }

    return this.createPaymentSub(createPaymentSubDto);
    await stripe.subscriptions.update(sub_id, {
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
      default_payment_method: paymentMethods.data[0].id,
      payment_settings: {
        payment_method_types: ['card'],
      },
      items: priceId,
    });
    sub_data.amount = price;
    sub_data.subLength = createPaymentSubDto.type;
    sub_data.subId = subscription._id;
    delete sub_data._id;
    delete sub_data['createdAt'];
    delete sub_data['updatedAt'];
    const res = await this.paymentModel.create({
      ...sub_data,
      extra: createPaymentSubDto.extra,
      expiration_date:
        createPaymentSubDto.type == 'MOTHLY'
          ? moment().add(1, 'months').utc()
          : moment().add(1, 'years').utc(),
    });
    if (
      sub_data.subLength == 'MONTHLY' &&
      createPaymentSubDto.type == 'YEARLY'
    ) {
      let subscription_expiration_date = new Date();
      subscription_expiration_date.setMonth(
        subscription_expiration_date.getMonth() + 12,
      );
      const updated = await this.userModel.findOneAndUpdate(
        { _id: userId },
        { subscription_expiration_date, subscription: subscription._id },
      );
    } else
      await this.userModel.findOneAndUpdate(
        { _id: userId },
        { subscription: subscription._id },
      );

    return { statusCode: 200, message: 'API.SUBSCRIPTION_UPDATED' };
  }

  async fetchTurnover(turnoverByProDto: turnoverByProDto) {
    // chiffre d'affaire
    //@ts-ignore

    const id = new mongoose.Types.ObjectId(`${turnoverByProDto.userId}`);

    try {
      let yearDetails = [];
      const turnoverTotal = await this.paymentModel.aggregate([
        {
          $match: {
            status: 'Success',
            //@ts-ignore

            to: new mongoose.Types.ObjectId(id),
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
            $or: [
              { 'eventId.finished': true },
              { 'appointmentId.finished': true },
            ],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      for (let i = 0; i < 12; i++) {
        const totalPerMonth = await this.paymentModel.aggregate([
          {
            $match: {
              status: 'Success',
              //@ts-ignore
              to: new mongoose.Types.ObjectId(id),
              $and: [
                {
                  createdAt: {
                    $gte: new Date(Date.UTC(turnoverByProDto.year, i, 1)),
                  },
                },
                {
                  createdAt: {
                    $lte: new Date(
                      Date.UTC(turnoverByProDto.year, i, 31, 23, 59, 59),
                    ),
                  },
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
            $unwind: {
              path: '$appointmentId',
              preserveNullAndEmptyArrays: true,
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
            $unwind: { path: '$eventId', preserveNullAndEmptyArrays: true },
          },
          {
            $match: {
              $or: [
                { 'eventId.finished': true },
                { 'appointmentId.finished': true },
              ],
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]);
        yearDetails.push(totalPerMonth);
      }

      return {
        statusCode: 200,
        message: 'API.TURNOVER.BY.PRO',
        data: turnoverTotal,
        turnoverJanvier: yearDetails[0],
        turnoverFevrier: yearDetails[1],
        turnoverMars: yearDetails[2],
        turnoverAvril: yearDetails[3],
        turnoverMai: yearDetails[4],
        turnoverJune: yearDetails[5],
        turnoverJuly: yearDetails[6],
        turnoverAugust: yearDetails[7],
        turnoverSeptember: yearDetails[8],
        turnoverOctober: yearDetails[9],
        turnoverNovember: yearDetails[10],
        turnoverDecember: yearDetails[11],
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async cancelSubscription(user) {
    const fetch_sub = await this.paymentModel.findOne({
      from: user._id,
      status: 'Success',
      type: 'Subscription',
      stripe_data: { $ne: null },
    });
    if (fetch_sub) {
      const stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });
      const cancel_sub = await stripe.subscriptions.del(
        fetch_sub.stripe_data.data.object.subscription,
      );
    }
    return {
      statusCode: 400,
      message: 'API.SUB.CANCELED',
    };
  }

  async fetchUserSubData(user) {
    const sub_user_data = await this.paymentModel
      .findOne({
        from: user._id,
        status: 'Success',
        type: 'Subscription',
      })
      .sort({ updatedAt: -1 })
      .populate('subId')
      .populate('from');
    return {
      statusCode: 200,
      message: 'API.SUB_DATA_FETCHED',
      data: sub_user_data,
    };
  }

  async fetchTotalPayements(turnoverByProDto: turnoverByProDto) {
    try {
      let yearDetails = [];
      const turnoverTotal = await this.paymentModel.aggregate([
        {
          $match: {
            status: 'Success',
            //@ts-ignore
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: {
                  if: { $eq: ['$type', 'Subscription'] },
                  then: '$stripe_data.data.object.total',
                  else: '$amount'
                }
              }
            },
          },
        },
      ]);

      for (let i = 0; i < 12; i++) {
        // export const lastday = (y,m)=>{
        //   return  new Date(y, m, 0,23).getDate();
        //   } new Date(y, m, 0,23).getDate();
        // console.log(
        //   getLastDayOfMonth(i+1,2023)
        //   );
        console.log(new Date(Date.UTC(Number(turnoverByProDto.year), i, 1)));

        console.log(
          new Date(
            new Date(
              Date.UTC(
                turnoverByProDto.year,
                i,
                getLastDayOfMonth(i + 1, Number(turnoverByProDto.year)),
                23,
              ),
            ),
          ),
        );

        //
        const totalPerMonth = await this.paymentModel.aggregate([
        
          {
            $lookup: {
              from: 'appointments',
              localField: 'appointmentId',
              foreignField: '_id',
              as: 'appointmentId',
            },
          },
          {
            $unwind: {
              path: '$appointmentId',
              preserveNullAndEmptyArrays: true,
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
            $unwind: { path: '$eventId', preserveNullAndEmptyArrays: true },
          },
          {
            $match: {
              $and: [
                { status: 'Success' },
                // {
                //   $or: [
                //     { 'eventId.finished': true },
                //     { 'appointmentId.finished': true },
                //   ],
                // },
                {
                  createdAt: {
                    $gte: new Date(Date.UTC(Number(turnoverByProDto.year), i, 1)),
                  },
                },
                {
                  createdAt: {
                    $lte: new Date(
                      new Date(
                        Date.UTC(
                          Number(turnoverByProDto.year),
                          i,
                          getLastDayOfMonth(i + 1, 2023),
                          23,
                        ),
                      ),
                    ),
                  },
                },
              ],
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: {
                    if: { $eq: ['$type', 'Subscription'] },
                    then: '$stripe_data.data.object.total',
                    else: '$amount'
                  }
                }
              },
            },
          },
          
        ]);
        yearDetails.push(totalPerMonth);
      }

      return {
        statusCode: 200,
        message: 'API.TURNOVER.BY.PRO',
        data: turnoverTotal,
        turnoverJanvier: yearDetails[0],
        turnoverFevrier: yearDetails[1],
        turnoverMars: yearDetails[2],
        turnoverAvril: yearDetails[3],
        turnoverMai: yearDetails[4],
        turnoverJune: yearDetails[5],
        turnoverJuly: yearDetails[6],
        turnoverAugust: yearDetails[7],
        turnoverSeptember: yearDetails[8],
        turnoverOctober: yearDetails[9],
        turnoverNovember: yearDetails[10],
        turnoverDecember: yearDetails[11],
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async fetchSubInvoice(
    skip,
    limit,
    search,
    user,
    from_date,
    to_date,
    skip_search,
  ) {
    if (!search) search = '';
    let sub_data = [];
    if (!skip_search)
      sub_data = await this.paymentModel.aggregate([
        {
          $match: {
            //@ts-ignore
            from: new mongoose.Types.ObjectId(user._id),
            type: 'Subscription',
            status: 'Success',
            $and: [
              { createdAt: { $gte: new Date(from_date) } },
              { createdAt: { $lte: new Date(to_date) } },
            ],
          },
        },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subId',
            foreignField: '_id',
            as: 'subId',
          },
        },
        { $unwind: '$subId' },
        {
          $match: {
            $or: [
              {
                reference: {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
              {
                'subId.name': {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

    let sub_total = await this.paymentModel.aggregate([
      //@ts-ignore
      {
        $match: {
          //@ts-ignore
          from: new mongoose.Types.ObjectId(user._id),
          type: 'Subscription',
          status: 'Success',
          $and: [
            { createdAt: { $gte: new Date(from_date) } },
            { createdAt: { $lte: new Date(to_date) } },
          ],
        },
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subId',
          foreignField: '_id',
          as: 'subId',
        },
      },
      { $unwind: '$subId' },
      {
        $match: {
          $or: [
            {
              reference: {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
            {
              'subId.name': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
          ],
        },
      },
    ]);
    return { sub_data, sub_total: sub_total.length, sub_total_data: sub_total };
  }

  async fetchEventPackInvoice(
    skip,
    limit,
    search,
    user,
    from_date,
    to_date,
    skip_search,
  ) {
    let query_search = {};
    if (!search) query_search['eventPackId.number_of_events'] = { $ne: null };
    else
      query_search = {
        $or: [
          {
            reference: {
              $regex: new RegExp(`${search}`),
              $options: 'i',
            },
          },
          { 'eventPackId.number_of_events': Number(search) },
        ],
      };
    let eventPack_data = [];
    if (!skip_search)
      eventPack_data = await this.paymentModel.aggregate([
        {
          $match: {
            $or: [
              {
                //@ts-ignore
                from: new mongoose.Types.ObjectId(user._id),
                status: 'Success',
                type: 'EventPack',
              },
            ],
            $and: [
              { createdAt: { $gte: new Date(from_date) } },
              { createdAt: { $lte: new Date(to_date) } },
            ],
          },
        },
        {
          $lookup: {
            from: 'eventspacks',
            localField: 'eventPackId',
            foreignField: '_id',
            as: 'eventPackId',
          },
        },
        {
          $unwind: {
            path: '$eventPackId',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: query_search,
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
    let event_total = await this.paymentModel.aggregate([
      {
        $match: {
          $or: [
            {
              //@ts-ignore
              from: new mongoose.Types.ObjectId(user._id),
              status: 'Success',
              type: 'EventPack',
            },
          ],
          $and: [
            { createdAt: { $gte: new Date(from_date) } },
            { createdAt: { $lte: new Date(to_date) } },
          ],
        },
      },
      {
        $lookup: {
          from: 'eventspacks',
          localField: 'eventPackId',
          foreignField: '_id',
          as: 'eventPackId',
        },
      },
      {
        $unwind: {
          path: '$eventPackId',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: query_search,
      },
      { $project: { stripe_data: 0 } },
      { $sort: { createdAt: -1 } },
    ]);
    return {
      eventPack_data,
      eventPack_total: event_total.length,
      eventPack_total_data: event_total,
    };
  }

  async fetchEventInvoice(
    skip,
    limit,
    search,
    user,
    from_date,
    to_date,
    skip_search,
  ) {
    if (!search) search = '';
    let event_data = [];
    if (!skip_search)
      event_data = await this.paymentModel.aggregate([
        {
          $match: {
            $or: [
              //@ts-ignore
              {
                //@ts-ignore
                to: new mongoose.Types.ObjectId(user._id),
                status: 'Success',
                type: 'Event',
              },
            ],
            $and: [
              { createdAt: { $gte: new Date(from_date) } },
              { createdAt: { $lte: new Date(to_date) } },
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
        { $unwind: { path: '$eventId', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'eventId.ended': true,
            $or: [
              {
                'eventId.event_name': {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
              {
                reference: {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
    let event_total = await this.paymentModel.aggregate([
      {
        $match: {
          $or: [
            //@ts-ignore
            {
              //@ts-ignore
              to: new mongoose.Types.ObjectId(user._id),
              status: 'Success',
              type: 'Event',
            },
          ],
          $and: [
            { createdAt: { $gte: new Date(from_date) } },
            { createdAt: { $lte: new Date(to_date) } },
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
      { $unwind: { path: '$eventId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'from',
          foreignField: '_id',
          as: 'from',
        },
      },
      { $unwind: { path: '$from', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'eventId.ended': true,
          $or: [
            {
              'eventId.event_name': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
            {
              reference: {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
    for (let i = 0; i < event_data.length; i++) {
      event_data[i].amount = +event_data[i].amount - 100;
    }
    return {
      event_data,
      event_total: event_total.length,
      event_total_data: event_total,
    };
  }

  async fetchAppointmentInvoice(
    skip,
    limit,
    search,
    user,
    from_date,
    to_date,
    skip_search,
  ) {
    if (!search) search = '';
    let appointment_data = [];
    if (!skip_search)
      appointment_data = await this.paymentModel.aggregate([
        {
          $match: {
            //@ts-ignore
            to: new mongoose.Types.ObjectId(user._id),
            type: 'Job',
            status: 'Success',
            $and: [
              { createdAt: { $gte: new Date(from_date) } },
              { createdAt: { $lte: new Date(to_date) } },
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
        { $unwind: '$appointmentId' },
        // //////////////////////////////////////////////////////
        {
          $lookup: {
            from: 'prestations',
            localField: 'appointmentId.prestations',
            foreignField: '_id',
            as: 'appointmentId.prestations',
          },
        },
        { $unwind: '$appointmentId.prestations' },

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
                $and: [
                  { 'appointmentId.status': 'Accepted' },
                  { 'appointmentId.finished': true },
                ],
              },
              { 'appointmentId.no_show': true },
              { status: 'Refunded' },
            ],
          },
        },
        {
          $match: {
            $or: [
              {
                $expr: {
                  $regexMatch: {
                    input: {
                      $concat: ['$from.firstName', ' ', '$from.lastName'],
                    },
                    regex: new RegExp(`${search}`),
                    options: 'i',
                  },
                },
              },
              {
                'from.firstName': {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
              {
                'from.lastName': {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
              {
                'appointmentId.prestations.name': {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
              {
                reference: {
                  $regex: new RegExp(`${search}`),
                  $options: 'i',
                },
              },
            ],
          },
        },
        { $project: { stripe_data: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

    let appointment_total = await this.paymentModel.aggregate([
      {
        $match: {
          //@ts-ignore
          to: new mongoose.Types.ObjectId(user._id),
          type: 'Job',
          status: 'Success',
          $and: [
            { createdAt: { $gte: new Date(from_date) } },
            { createdAt: { $lte: new Date(to_date) } },
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
      { $unwind: '$appointmentId' },
      // //////////////////////////////////////////////////////
      {
        $lookup: {
          from: 'prestations',
          localField: 'appointmentId.prestations',
          foreignField: '_id',
          as: 'appointmentId.prestations',
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
              $and: [
                { 'appointmentId.status': 'Accepted' },
                { 'appointmentId.finished': true },
              ],
            },
            { 'appointmentId.no_show': true },
            { status: 'Refunded' },
          ],
        },
      },
      {
        $match: {
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: ['$from.firstName', ' ', '$from.lastName'],
                  },
                  regex: new RegExp(`${search}`),
                  options: 'i',
                },
              },
            },
            {
              'from.firstName': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
            {
              'from.lastName': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
            {
              'appointmentId.prestations.name': {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
            {
              reference: {
                $regex: new RegExp(`${search}`),
                $options: 'i',
              },
            },
          ],
        },
      },
      { $project: { stripe_data: 0 } },
      { $sort: { createdAt: -1 } },
    ]);
    appointment_data = this.updateDataForFees(appointment_data);
    appointment_total = this.updateDataForFees(appointment_total);
    return {
      appointment_data,
      appointment_total: appointment_total.length,
      appointment_total_data: appointment_total,
    };
  }

  updateDataForFees(data) {
    for (let i = 0; i < data.length; i++) {
      if (+data[i].appointmentId.total_amount + 100 == data[i].amount)
        data[i].amount = data[i].appointmentId.total_amount;
    }
    return data;
  }

  async transfertPaymentDetails(user_id, skip, limit) {
    const transfert_data = await this.paymentModel
      .find({ type: 'Transfert', to: user_id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const transfert_total = await this.paymentModel
      .find({ type: 'Transfert', to: user_id })
      .sort({ createdAt: -1 });
    return { transfert_data, transfert_total: transfert_total.length };
  }

  async totalFacture(user, from_date, to_date) {
    const { appointment_data, appointment_total } =
      await this.fetchAppointmentInvoice(
        1,
        1,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { event_data, event_total } = await this.fetchEventInvoice(
      1,
      1,
      '',
      user,
      from_date,
      to_date,
      true,
    );
    const { eventPack_data, eventPack_total } =
      await this.fetchEventPackInvoice(
        1,
        1,
        '',
        user,
        from_date,
        to_date,
        true,
      );
    const { sub_data, sub_total } = await this.fetchSubInvoice(
      1,
      1,
      '',
      user,
      from_date,
      to_date,
      true,
    );

    return (
      Number(sub_total) +
      Number(event_total) +
      Number(appointment_total) +
      Number(eventPack_total)
    );
  }

  async clientInvoice(limit, skip, search, user, from_date, to_date) {
    if (!search) search = '';
    const invoice_data = await this.paymentModel.aggregate([
      {
        $match: {
          //@ts-ignore
          from: new mongoose.Types.ObjectId(user._id),
          status: 'Success',
          $and: [
            { createdAt: { $gte: new Date(from_date) } },
            { createdAt: { $lte: new Date(to_date) } },
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
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },
      { $unwind: '$to.relatedCompany' },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'eventId',
        },
      },
      { $unwind: { path: '$eventId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointmentId',
        },
      },
      { $unwind: { path: '$appointmentId', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $and: [
            {
              $or: [
                {
                  reference: {
                    $regex: new RegExp(`${search}`),
                    $options: 'i',
                  },
                },
                {
                  'to.relatedCompany.companyName': {
                    $regex: new RegExp(`${search}`),
                    $options: 'i',
                  },
                },
              ],
            },
            {
              $or: [
                { 'appointmentId.finished': true },
                { 'eventId.ended': true },
                {
                  $and: [
                    { 'appointmentId.status': 'Canceled' },
                    { status: 'Success' },
                  ],
                },
              ],
            },
          ],
        },
      },
      { $project: { stripe_data: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    const invoice_length = await this.paymentModel.aggregate([
      {
        $match: {
          //@ts-ignore
          from: new mongoose.Types.ObjectId(user._id),
          status: 'Success',
          $and: [
            { createdAt: { $gte: new Date(from_date) } },
            { createdAt: { $lte: new Date(to_date) } },
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
          from: 'companies',
          localField: 'to.relatedCompany',
          foreignField: '_id',
          as: 'to.relatedCompany',
        },
      },
      { $unwind: '$to.relatedCompany' },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'eventId',
        },
      },
      { $unwind: { path: '$eventId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointmentId',
        },
      },
      { $unwind: { path: '$appointmentId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'prestations',
          localField: 'appointmentId.prestations',
          foreignField: '_id',
          as: 'appointmentId.prestations',
        },
      },
      {
        $match: {
          $and: [
            {
              $or: [
                {
                  reference: {
                    $regex: new RegExp(`${search}`),
                    $options: 'i',
                  },
                },
                {
                  'to.relatedCompany.companyName': {
                    $regex: new RegExp(`${search}`),
                    $options: 'i',
                  },
                },
              ],
            },
            {
              $or: [
                { 'appointmentId.finished': true },
                { 'eventId.ended': true },
                {
                  $and: [
                    { 'appointmentId.status': 'Canceled' },
                    { status: 'Success' },
                  ],
                },
              ],
            },
          ],
        },
      },
      { $project: { stripe_data: 0 } },
      { $sort: { createdAt: -1 } },
    ]);
    return {
      invoice_data,
      invoice_length: invoice_length.length,
      invoice_length_data: invoice_length,
    };
  }

  async createCoupns(createCouponDto: createCouponDto) {
    try {
      const stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });
      const coupon = await stripe.coupons.create({
        duration: 'once',
        id: createCouponDto.name,
        percent_off: createCouponDto.percent_off,
      });
      let couponGenerated = await this.couponModel.create({
        code: createCouponDto.name,
        expires_at: new Date(createCouponDto.expires_at).toISOString(),
        percent_off: createCouponDto.percent_off,
        subscriptions: createCouponDto.subscriptions,
        to: createCouponDto.to,
        duration: createCouponDto.duration, // MONTHLY or YEARLY
      });
      return {
        statusCode: 201,
        message: 'API.GENERATE.DISCOUNT',
        data: couponGenerated,
      };
    } catch (error) {
      console.log('createCoupns error : ', error);
      return {
        statusCode: error.statusCode,
        message: error.message,
        data: null,
      };
    }
  }

  async deleteCoupon(createCouponDto: createCouponDto) {
    try {
      const stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });
      const deletCoupon = await stripe.coupons.del(
        `${createCouponDto.couponName}`,
      );
      let couponDeleted = await this.couponModel.deleteOne({
        code: createCouponDto.couponName,
      });
      console.log('000000', deletCoupon);
      console.log('11111111', couponDeleted);

      return {
        statusCode: 202,
        message: 'API.GENERATE.DISCOUNT',
        data: couponDeleted,
      };
    } catch (error) {
      console.log('createCoupns error : ', error);
      return {
        statusCode: error.statusCode,
        message: error.message,
        data: null,
      };
    }
  }

  async getAllDiscounts(fetchDiscounts: FetchDiscounts) {
    try {
      let filter = '';
      if (fetchDiscounts.search) {
        filter = fetchDiscounts.search;
      }

      let getDiscounts = await this.couponModel
        .find({
          code: {
            $regex: new RegExp(`${filter}`),
            $options: 'i',
          },
        })
        .populate(['subscriptions'])
        .sort({ createdAt: -1 })
        .skip(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? (+fetchDiscounts.page_number - 1) * +fetchDiscounts.page_size
            : 0,
        )
        .limit(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? +fetchDiscounts.page_size
            : 10,
        );

      let totalDiscounts = await this.couponModel.find({
        code: {
          $regex: new RegExp(`${filter}`),
          $options: 'i',
        },
      });

      return {
        total: totalDiscounts.length,
        statusCode: 200,
        message: 'API.FETCH.ALL.DISCOUNTS',
        data: getDiscounts,
      };
    } catch (error) {
      console.log('createCoupns error : ', error);
      return {
        statusCode: 404,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async updateCoupon(createCouponDto: createCouponDto) {
    try {
      // verify if coupon name exist
      let verifyNameDisponibility = await this.couponModel.find({
        code: createCouponDto.name,
      });
      if (verifyNameDisponibility.length > 0) {
        // check coupon even if the name exists but you are trying to update the same coupon so you will recreate the same coupon with the same name with some other updates
        let checkCoupon = await this.couponModel.findOne({
          _id: createCouponDto.couponId,
        });
        if (checkCoupon.code == createCouponDto.name) {
          const stripe = new Stripe(process.env.STRIPE, {
            apiVersion: '2022-08-01',
          });

          const deletCoupon = await stripe.coupons.del(
            `${createCouponDto.couponName}`,
          );

          const coupon = await stripe.coupons.create({
            duration: 'once',
            id: createCouponDto.name,
            percent_off: createCouponDto.percent_off,
          });

          let couponDeleted = await this.couponModel.deleteOne({
            _id: createCouponDto.couponId,
          });

          let couponGenerated = await this.couponModel.create({
            code: createCouponDto.name,
            expires_at: new Date(createCouponDto.expires_at).toISOString(),
            percent_off: createCouponDto.percent_off,
            subscriptions: createCouponDto.subscriptions,
            to: createCouponDto.to,
            duration: createCouponDto.duration, // MONTHLY or YEARLY
          });

          return {
            statusCode: 202,
            message: 'API.UPDATE.COUPON.DISCOUNT',
            data: couponGenerated,
          };
        } else {
          // in case coupon name exists but you are trying to update an other coupon
          throw new HttpException(
            'name already in use',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      } else {
        const stripe = new Stripe(process.env.STRIPE, {
          apiVersion: '2022-08-01',
        });

        const coupon = await stripe.coupons.create({
          duration: 'once',
          id: createCouponDto.name,
          percent_off: createCouponDto.percent_off,
        });

        const deletCoupon = await stripe.coupons.del(
          `${createCouponDto.couponName}`,
        );

        let couponGenerated = await this.couponModel.create({
          code: createCouponDto.name,
          expires_at: new Date(createCouponDto.expires_at).toISOString(),
          percent_off: createCouponDto.percent_off,
          subscriptions: createCouponDto.subscriptions,
          to: createCouponDto.to,
          duration: createCouponDto.duration, // MONTHLY or YEARLY
        });

        let couponDeleted = await this.couponModel.deleteOne({
          _id: createCouponDto.couponId,
        });

        return {
          statusCode: 202,
          message: 'API.UPDATE.COUPON.DISCOUNT',
          data: couponGenerated,
        };
      }
    } catch (error) {
      console.log('updateCoupon error : ', error);
      return {
        statusCode: error.statusCode || error.status,
        message: error.message,
        data: null,
      };
    }
  }

  async subscriptionPayment(fetchDiscounts: FetchDiscounts) {
    try {
      let subs = await this.paymentModel
        .find({
          type: 'Subscription',
          status: 'Success',
        })
        .populate('subId')
        .populate({
          path: 'from',
          populate: {
            path: 'relatedCompany',
          },
        })
        .skip(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? (+fetchDiscounts.page_number - 1) * +fetchDiscounts.page_size
            : 0,
        )
        .limit(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? +fetchDiscounts.page_size
            : 10,
        );
      // from.relatedcompany

      let total = await this.paymentModel
        .find({
          type: 'Subscription',
          status: 'Success',
        })
        .count();

      return {
        statusCode: 200,
        message: 'API.FETCH.SUBS.PAYMENT',
        data: subs,
        page_number: fetchDiscounts.page_number,
        page_size: fetchDiscounts.page_size,
        total_attributs: total,
      };
    } catch (error) {
      console.log('subscriptionPayment error : ', error);
      return {
        statusCode: error.statusCode || error.status,
        message: error.message,
        data: null,
      };
    }
  }

  async eventPackPayment(fetchDiscounts: FetchDiscounts) {
    try {
      let packs = await this.paymentModel
        .find({
          type: 'EventPack',
          status: 'Success',
        })
        .populate('eventPackId')
        .populate({
          path: 'from',
          populate: {
            path: 'relatedCompany',
          },
        })
        .skip(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? (+fetchDiscounts.page_number - 1) * +fetchDiscounts.page_size
            : 0,
        )
        .limit(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? +fetchDiscounts.page_size
            : 10,
        );
      // from.relatedcompany

      let total = await this.paymentModel
        .find({
          type: 'EventPack',
          status: 'Success',
        })
        .count();

      return {
        statusCode: 200,
        message: 'API.FETCH.EVENTPACK.PAYMENT',
        data: packs,
        page_number: fetchDiscounts.page_number,
        page_size: fetchDiscounts.page_size,
        total_attributs: total,
      };
    } catch (error) {
      console.log('eventPackPayment error : ', error);
      return {
        statusCode: error.statusCode || error.status,
        message: error.message,
        data: null,
      };
    }
  }

  async appointmentPayment(fetchDiscounts: FetchDiscounts) {
    try {
      let appointment = await this.paymentModel
        .find({
          type: 'Job',
          status: 'Success',
        })
        .populate(['appointmentId', 'from'])
        .populate({
          path: 'to',
          populate: {
            path: 'relatedCompany',
          },
        })
        .skip(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? (+fetchDiscounts.page_number - 1) * +fetchDiscounts.page_size
            : 0,
        )
        .limit(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? +fetchDiscounts.page_size
            : 10,
        );
      // to.relatedcompany

      let total = await this.paymentModel
        .find({
          type: 'Job',
          status: 'Success',
        })
        .count();

      return {
        statusCode: 200,
        message: 'API.FETCH.APPOINTMENT.PAYMENT',
        data: appointment,
        page_number: fetchDiscounts.page_number,
        page_size: fetchDiscounts.page_size,
        total_attributs: total,
      };
    } catch (error) {
      console.log('eventPackPayment error : ', error);
      return {
        statusCode: error.statusCode || error.status,
        message: error.message,
        data: null,
      };
    }
  }

  async eventPayment(fetchDiscounts: FetchDiscounts) {
    try {
      let events = await this.paymentModel
        .find({
          type: 'Event',
          status: 'Success',
        })
        .populate('from')
        .populate({
          path: 'to',
          populate: {
            path: 'relatedCompany',
          },
        })
        .populate({
          path: 'eventId',
          populate: {
            path: 'activity',
          },
        })
        .skip(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? (+fetchDiscounts.page_number - 1) * +fetchDiscounts.page_size
            : 0,
        )
        .limit(
          fetchDiscounts.page_number && fetchDiscounts.page_size
            ? +fetchDiscounts.page_size
            : 10,
        );
      // to.relatedcompany

      let total = await this.paymentModel
        .find({
          type: 'Event',
          status: 'Success',
        })
        .count();

      return {
        statusCode: 200,
        message: 'API.FETCH.EVENT.PAYMENT',
        data: events,
        page_number: fetchDiscounts.page_number,
        page_size: fetchDiscounts.page_size,
        total_attributs: total,
      };
    } catch (error) {
      console.log('event error : ', error);
      return {
        statusCode: error.statusCode || error.status,
        message: error.message,
        data: null,
      };
    }
  }
}
