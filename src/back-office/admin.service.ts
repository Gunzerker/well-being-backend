/*
https://docs.nestjs.com/providers#services
*/

import {
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  CreateSubscriptionDto,
  TestCreateSubscriptionDto,
  TestUpdateSubscriptionDto,
} from 'src/api/users/dto/createSubscription.Dto';
import { UsersService } from 'src/api/users/users.service';
import { SOMETHING_WENT_WRONG, SUCCEEDED } from 'src/constantes/constantes';
import { device, privilege } from 'src/shared/enums';
import { apiReturner } from 'src/shared/returnerApi';
import { Subscription, TestSubscription } from './models/subscription.model';
import { Payment } from './models/payement.model';

import mongoose from 'mongoose';

import Stripe from 'stripe';

import { Gpp, GppDto } from './models/gpp2';
import {
  EventsPack,
  EventsPackSchema,
} from '../api/eventspack/schemas/eventspack.entity';

import {
  DeleteUserDto,
  RegisterUserByAdminDto,
} from 'src/api/auth/dto/createUserDto';

import { AuthService } from 'src/api/auth/auth.service';
import { User } from 'src/api/users/models/user.model';
import { UpdateEventPackAdmin } from './dto/event.dto';
import { UpdateUserByAdminDto } from './dto/user.dto';
import { PaymentService } from 'src/api/payment/payment.service';
import { UpdateSubscriptionBackofficeDto } from './dto/payement.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(TestSubscription.name)
    private readonly testsubscriptionModel: Model<TestSubscription>,
    private readonly payementService: PaymentService,
    @InjectModel(EventsPack.name) private eventsPackModel: Model<EventsPack>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Gpp.name)
    private readonly GppModel: Model<Gpp>,
    private userService: UsersService,
    //@Inject(forwardRef(() => AuthService))
    private authservice: AuthService,
  ) {}
  //
  //
  //
  //
  async createProService(newUserPro: RegisterUserByAdminDto) {
    return await this.authservice.registerUserService(null, newUserPro);
  }
  async createGpp(data: GppDto,locale:string) {
    const result = await this.GppModel.findOneAndUpdate(
      { id: null,locale:locale },
      {
        ...data
      },
      { upsert: true },
    );
    if (result) {
      return apiReturner(HttpStatus.CREATED, SUCCEEDED);
    } else {
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }
  }
  async getGpp(locale?: string) {
    try {
      
      if (!locale) { locale = "fr" }
      const result = await this.GppModel.findOne({ id: null, locale });
      console.log(result);
      
      if (result) {
        return apiReturner(HttpStatus.CREATED, SUCCEEDED, {
          generalConditions: result.generalConditions,
          paymentRules: result.paymentRules,
          privacyPolicy: result.privacyPolicy,
          politiqueCookies: result.politiqueCookies,
          conditionsVente: result.conditionsVente,
        });
      } else {
        return { message: "no result" };
      }
  
    } catch (e) {
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG)
    }
  }
  //
  //

  async createSubscriptionService(subscripdata: CreateSubscriptionDto) {
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    const { monthly_payment, yearly_payment } = subscripdata;
    const _id = new mongoose.Types.ObjectId();
    const monthly_price_stripe = await stripe.prices.create({
      unit_amount: monthly_payment,
      currency: 'eur',
      recurring: { interval: 'month' },
      product_data: { name: `${subscripdata.name}_month` },
      lookup_key: `${String(_id)}_month`,
    });

    const yearly_price_stripe = await stripe.prices.create({
      unit_amount: yearly_payment,
      currency: 'eur',
      recurring: { interval: 'year' },
      product_data: { name: `${subscripdata.name}_year` },
      lookup_key: `${String(_id)}_year`,
    });

    /* create extra sub */
    for (let i = 0; i < subscripdata.dimensionnement.length; i++) {
      if (
        subscripdata.dimensionnement[i].pricing_monthly == 0 &&
        subscripdata.dimensionnement[i].pricing_yearly == 0
      )
        continue;
      const yearly_payment_with_extra = await stripe.prices.create({
        unit_amount:
          yearly_payment + subscripdata.dimensionnement[i].pricing_yearly,
        currency: 'eur',
        recurring: { interval: 'year' },
        product_data: { name: `${subscripdata.name}_year_extra` },
        lookup_key: `${String(_id)}_year_extra`,
      });
      subscripdata.yearly_payment_with_extra_id = yearly_payment_with_extra.id;

      const monthly_payment_with_extra = await stripe.prices.create({
        unit_amount:
          monthly_payment + subscripdata.dimensionnement[i].pricing_monthly,
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: { name: `${subscripdata.name}_month_extra` },
        lookup_key: `${String(_id)}_month_extra`,
      });

      subscripdata.monthly_payment_with_extra_id =
        monthly_payment_with_extra.id;
    }
    subscripdata.monthly_payment_id = monthly_price_stripe.id;
    subscripdata.yearly_payment_id = yearly_price_stripe.id;

    const saved = (
      await this.subscriptionModel.create({ _id, ...subscripdata })
    ).save;
    if (!saved) throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    return apiReturner(HttpStatus.CREATED, SUCCEEDED);
  }
  //todo -----------------------------------------------------------------------------
  async testupdateSubscriptionService(
    subscripdata: TestUpdateSubscriptionDto,
    _id: string,
  ) {
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    const {
      monthly_payment,
      yearly_payment,
      monthly_payment_extras,
      yearly_payment_extras,
    } = subscripdata;
    let monthly_price_stripe;
    let yearly_price_stripe;
    let monthly_price_stripe_extra;
    let yearly_price_stripe_extra;

    if (monthly_payment && subscripdata.monthly_payment_id) {
      // const monthly_price_stripe = await stripe.prices.update(
      //   'price_1Lb3N2AjRu3zL9rvxefjPoko',
      //  { unit_amount: 1900,
      //   currency: 'usd',}
      // //  { currency_options: { eur: { unit_amount: 100 } } },
      // );

      console.log('monthly_price_stripe : ', monthly_price_stripe);
      // subscripdata.monthly_payment_id = monthly_price_stripe.id;
    } else if (yearly_payment && subscripdata.yearly_payment_id) {
      yearly_price_stripe = await stripe.prices.update(
        subscripdata.yearly_payment_id,
        {
          metadata: {
            unit_amount: yearly_payment,
          },
        },
      );
      console.log('yearly_price_stripe : ', yearly_price_stripe);
    } else if (
      monthly_payment_extras &&
      subscripdata.monthly_payment_with_extra_id
    ) {
      monthly_price_stripe_extra = await stripe.prices.update(
        subscripdata.monthly_payment_with_extra_id,
        {
          metadata: {
            unit_amount: monthly_price_stripe_extra,
          },
        },
      );
      console.log('monthly_price_stripe_extra : ', monthly_price_stripe_extra);
    } else if (
      yearly_payment_extras &&
      subscripdata.yearly_payment_with_extra_id
    ) {
      yearly_price_stripe_extra = await stripe.prices.update(
        subscripdata.yearly_payment_with_extra_id,
        {
          metadata: {
            unit_amount: yearly_price_stripe_extra,
          },
        },
      );
      console.log('yearly_price_stripe_extra : ', yearly_price_stripe_extra);
    } else {
      throw new InternalServerErrorException('type_mismatsh');
    }

    const saved = await this.testsubscriptionModel.updateOne(
      { _id },
      { ...subscripdata },
    );
    if (!saved)
      throw new InternalServerErrorException(
        SOMETHING_WENT_WRONG + ' or id not existe',
      );
    return apiReturner(HttpStatus.CREATED, SUCCEEDED);
  }
  async testCreateSubscriptionDto(subscripdata: TestCreateSubscriptionDto) {
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    const { monthly_payment, yearly_payment } = subscripdata;
    const _id = new mongoose.Types.ObjectId();
    const monthly_price_stripe = await stripe.prices.create({
      unit_amount: monthly_payment,
      currency: 'eur',
      recurring: { interval: 'month' },
      product_data: { name: `${subscripdata.name}_month` },
      lookup_key: `${String(_id)}_month`,
    });

    const yearly_price_stripe = await stripe.prices.create({
      unit_amount: yearly_payment,
      currency: 'eur',
      recurring: { interval: 'year' },
      product_data: { name: `${subscripdata.name}_year` },
      lookup_key: `${String(_id)}_year`,
    });

    /* create extra sub */
    for (let i = 0; i < subscripdata.dimensionnement.length; i++) {
      if (
        subscripdata.dimensionnement[i].pricing_monthly == 0 &&
        subscripdata.dimensionnement[i].pricing_yearly == 0
      )
        continue;
      const yearly_payment_with_extra = await stripe.prices.create({
        unit_amount:
          yearly_payment + subscripdata.dimensionnement[i].pricing_yearly,
        currency: 'eur',
        recurring: { interval: 'year' },
        product_data: { name: `${subscripdata.name}_year_extra` },
        lookup_key: `${String(_id)}_year_extra`,
      });
      subscripdata.yearly_payment_with_extra_id = yearly_payment_with_extra.id;

      const monthly_payment_with_extra = await stripe.prices.create({
        unit_amount:
          monthly_payment + subscripdata.dimensionnement[i].pricing_monthly,
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: { name: `${subscripdata.name}_month_extra` },
        lookup_key: `${String(_id)}_month_extra`,
      });

      subscripdata.monthly_payment_with_extra_id =
        monthly_payment_with_extra.id;
    }
    subscripdata.monthly_payment_id = monthly_price_stripe.id;
    subscripdata.yearly_payment_id = yearly_price_stripe.id;

    const saved = (
      await this.testsubscriptionModel.create({ _id, ...subscripdata })
    ).save;
    if (!saved) throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    return apiReturner(HttpStatus.CREATED, SUCCEEDED);
  }
  async testgetAllSubscriptionService(query: string) {
    return apiReturner(
      HttpStatus.OK,
      SUCCEEDED,
      await this.testsubscriptionModel.find(),
    );
  }
  //todo -----------------------------------------------------------------------------

  signInService(userName: string, password: string) {
    if (userName == privilege.ADMIN && password == '123456789') {
      return true;
    } else false;
  }

  async updateSubscriptionService(subscripdata: CreateSubscriptionDto) {
    const stripe = new Stripe(process.env.STRIPE, {
      apiVersion: '2022-08-01',
    });
    const {
      monthly_payment,
      yearly_payment,
      monthly_payment_extras,
      yearly_payment_extras,
    } = subscripdata;
    let monthly_price_stripe;
    let yearly_price_stripe;
    let monthly_price_stripe_extra;
    let yearly_price_stripe_extra;
    const _id = new mongoose.Types.ObjectId();

    if (monthly_payment) {
      monthly_price_stripe = await stripe.prices.update(
        'price_1Lb3N2AjRu3zL9rvMUlsGjSO',
        {
          metadata: {
            unit_amount: monthly_payment,
          },
        },
      );

      console.log('monthly_price_stripe : ', monthly_price_stripe);
      subscripdata.monthly_payment_id = monthly_price_stripe.id;
    }

    if (yearly_payment) {
      yearly_price_stripe = await stripe.prices.update(
        'price_1Lb3N2AjRu3zL9rvxefjPoko',
        {
          metadata: {
            unit_amount: yearly_payment,
          },
        },
      );
      console.log('yearly_price_stripe : ', yearly_price_stripe);
      subscripdata.yearly_payment_id = yearly_price_stripe.id;
    }

    if (monthly_payment_extras) {
      monthly_price_stripe_extra = await stripe.prices.update(
        'price_1Lb3N2AjRu3zL9rvxefjPoko',
        {
          metadata: {
            unit_amount: monthly_price_stripe_extra,
          },
        },
      );
      console.log('monthly_price_stripe_extra : ', monthly_price_stripe_extra);
      subscripdata.monthly_payment_with_extra_id =
        monthly_price_stripe_extra.id;
    }

    if (yearly_payment_extras) {
      yearly_price_stripe_extra = await stripe.prices.update(
        'price_1Lb3N2AjRu3zL9rvxefjPoko',
        {
          metadata: {
            unit_amount: yearly_price_stripe_extra,
          },
        },
      );
      console.log('yearly_price_stripe_extra : ', yearly_price_stripe_extra);
      subscripdata.yearly_payment_with_extra_id = yearly_price_stripe_extra.id;
    }

    const saved = (
      await this.subscriptionModel.create({ _id, ...subscripdata })
    ).save;
    if (!saved) throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    return apiReturner(HttpStatus.CREATED, SUCCEEDED);
  }

  async priceWebhook(data: any) {
    if (data.type == 'price.updated') {
      /* fetch the subscription */
      const sub = await this.testsubscriptionModel.findOne({
        $or: [
          { monthly_payment_id: data.data.object.id },
          { yearly_payment_id: data.data.object.id },
          { monthly_payment_with_extra_id: data.data.object.id },
          { yearly_payment_with_extra_id: data.data.object.id },
        ],
      });
      if (!sub) return {};
      let update_query = {};
      if (sub['monthly_payment_id'] == data.data.object.id)
        sub['monthly_payment'] = data.data.object.unit_amount;

      if (sub['monthly_payment_with_extra_id'] == data.data.object.id) {
        sub['monthly_payment_extras'] = data.data.object.unit_amount;
        const new_extras_price =
          data.data.object.unit_amount - sub['monthly_payment_extras'];
        for (let i = 0; i < sub['dimensionnement'].length; i++) {
          if (sub['dimensionnement'][i]['pricing_monthly'] != 0)
            sub['dimensionnement'][i]['pricing_monthly'] = new_extras_price;
        }
      }

      if (sub['yearly_payment_id'] == data.data.object.id)
        sub['yearly_payment'] = data.data.object.unit_amount;

      if (sub['yearly_payment_with_extra_id'] == data.data.object.id) {
        sub['yearly_payment_extras'] = data.data.object.unit_amount;
        const new_extras_price =
          data.data.object.unit_amount - sub['yearly_payment_extras'];
        for (let i = 0; i < sub['dimensionnement'].length; i++) {
          if (sub['dimensionnement'][i]['pricing_yearly'] != 0)
            sub['dimensionnement'][i]['pricing_yearly'] = new_extras_price;
        }
      }
      await sub.save();
    }

    return {};
  }

  async daleteSubscriptionService(_id: string) {
    return apiReturner(
      HttpStatus.OK,
      SUCCEEDED,
      await this.subscriptionModel.findOneAndUpdate({ _id, cached: true }),
    );
  }

  async getSubscriptionByIdService(_id: string) {}

  //!-------------------------------
  async getAllSubscriptionService(query: string) {
    return apiReturner(
      HttpStatus.OK,
      SUCCEEDED,
      await this.subscriptionModel.find({cached:{$ne:true}}),
    );
  }
  async getAllUserByRole(
    addedByAdmin: boolean,
    page_number: number,
    page_size: number,
    anyone?: { role?: string; toSearch?: any },
  ) {
    const { result, resultLen } = await this.userService.getUsersByRole(
      addedByAdmin,
      anyone ? anyone.role : null,
      anyone ? anyone.toSearch : null,
      page_number,
      page_size,
    );

    return {
      statusCode: 200,
      message: SUCCEEDED,
      data: result,
      // .slice((page_number - 1) * page_size, page_number * page_size)
      // .sort((a: User, b: User) => {
      //   return (
      //     Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt))
      //   );
      // })
      page_number,
      page_size,
      total_attributs: resultLen,
    };
  }

  async updateEventPack(updateEventPackAdmin: UpdateEventPackAdmin) {
    let generateId: any;
    if (!updateEventPackAdmin._id) {
      //@ts-ignore
      generateId = new mongoose.mongo.ObjectId();
    } else {
      generateId = updateEventPackAdmin._id;
    }

    const data = await this.eventsPackModel.findOneAndUpdate(
      { _id: generateId },
      {
        number_of_events: updateEventPackAdmin.number_of_events,
        price: updateEventPackAdmin.price,
      },
      {
        upsert: true,
        new: true,
      },
    );

    return {
      statusCode: 201,
      message: 'API.EVENTPACK.WITH.SUCCESS',
      data,
    };
  }

  async fetchAllEventPack(updateEventPackAdmin: UpdateEventPackAdmin) {
    const { page_number, page_size } = updateEventPackAdmin;
    let toSearchTxt = null;
    if (updateEventPackAdmin.toSearch) {
      toSearchTxt = updateEventPackAdmin.toSearch;
    }
    console.log('fetch event pack :');
    const total = await this.eventsPackModel.count();
    const data = await this.eventsPackModel
      .find()
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10);
    return {
      statusCode: 200,
      message: 'API.FETCH.EVENT.PACKS',
      data,
      page_number,
      page_size,
      total_attributs: total,
    };
  }

  async deleteEventPack(updateEventPackAdmin: UpdateEventPackAdmin) {
    console.log('delete event pack :');
    const data = await this.eventsPackModel.deleteOne({
      _id: updateEventPackAdmin._id,
    });
    return {
      statusCode: 200,
      message: 'API.DELETE.EVENT.PACKS',
      data,
    };
  }

  async updateUserByAdmin(updateUserByAdminDto: UpdateUserByAdminDto) {
    try {
      let verifEMail;
      if (updateUserByAdminDto.email) {
        verifEMail = await this.userModel.findOne({
          email: updateUserByAdminDto.email,
        });
      }

      console.log('verifEMail', verifEMail);

      if (verifEMail?.email != null) {
        return {
          statusCode: 400,
          message: 'API.EMAIL.ALREADY.IN.USE',
          data: null,
        };
      } else {
        const data = await this.userModel.findOneAndUpdate(
          { _id: updateUserByAdminDto._id },
          {
            firstName: updateUserByAdminDto.firstName,
            lastName: updateUserByAdminDto.lastName,
            jobTitle: updateUserByAdminDto.jobTitle,
            profileImage: updateUserByAdminDto.profileImage,
            active: updateUserByAdminDto.active,
            phoneNumber: updateUserByAdminDto.phoneNumber,
            address: updateUserByAdminDto.address,
            email: updateUserByAdminDto.email,
          },
          { new: true },
        );
        if (updateUserByAdminDto.active == false) {
          // call pusher here
          const Pusher = require('pusher');
          const pusher = new Pusher({
            appId: process.env.pusher_appId,
            key: process.env.pusher_key,
            secret: process.env.pusher_secret,
            cluster: process.env.pusher_cluster,
            useTLS: process.env.pusher_userTLS,
          });
          await pusher.trigger(updateUserByAdminDto._id, 'ban', {
            message: 'user banned',
          });
        }
        return {
          statusCode: 201,
          message: 'API.UPDATE.USERS.BACKOFFICE',
          data,
        };
      }
    } catch (error) {
      console.log('update user error: ', error);

      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async createPriceStripe() {
    try {
      // const stripe = new Stripe(process.env.STRIPE, {
      //   apiVersion: '2022-08-01',
      // });

      // const stripe = require('stripe')('xxxxxxx');
      // unit_amount, interval, product, previousPriceName,
      // update mongoDB monthly payement id ...
      // update users

      const stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });

      const price = await stripe.prices.create({
        unit_amount: 1400,
        currency: 'usd',
        recurring: { interval: 'month' },
        //price_1Lb3SIAjRu3zL9rviWypSQzj
        // product_data: { name: `price_1Lb3SIAjRu3zL9rviWypSAcc` },
        product: 'prod_MaUNxh7oEGOrhr',
      });

      console.log('price**********************', price);
      return {
        statusCode: 201,
        message: 'API.CREATE.PRICE.SUBSCRIPTION.BACKOFFICE',
        data: price,
      };
    } catch (error) {
      console.log('price**********************', error);
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async listPrices() {
    try {
      // const stripe = new Stripe(process.env.STRIPE, {
      //   apiVersion: '2022-08-01',
      // });

      const stripe = require('stripe')('xxxxxxx');

      const price = await stripe.prices.list({});

      console.log('price**********************', price);
      return {
        statusCode: 201,
        message: 'API.LIST.PRICEs.SUBSCRIPTION.BACKOFFICE',
        data: price,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async createProduct() {
    try {
      // const stripe = new Stripe(process.env.STRIPE, {
      //   apiVersion: '2022-08-01',
      // });

      const stripe = require('stripe')('xxxxxxx');

      const product = await stripe.products.create({
        name: 'backoffice7777',
      });

      console.log('product**********************', product);
      return {
        statusCode: 201,
        message: 'API.CREATE.PRICE.SUBSCRIPTION.BACKOFFICE',
        data: product,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async retrievePrice() {
    try {
      // const stripe = new Stripe(process.env.STRIPE, {
      //   apiVersion: '2022-08-01',
      // });

      const stripe = require('stripe')('xxxxxxx');

      const price = await stripe.prices.retrieve(
        'price_1Lr7qL2eZvKYlo2CTsBAUqEr',
      );

      console.log('product**********************', price);
      return {
        statusCode: 201,
        message: 'API.CREATE.PRICE.SUBSCRIPTION.BACKOFFICE',
        data: price,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async updatePriceActivation() {
    try {
      // const stripe = new Stripe(process.env.STRIPE, {
      //   apiVersion: '2022-08-01',
      // });

      const stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });

      const price = await stripe.prices.update(
        'price_1LrJOeAjRu3zL9rviVdiZRcY',
        { active: false },
      );

      console.log('product**********************', price);
      return {
        statusCode: 201,
        message: 'API.CREATE.PRICE.SUBSCRIPTION.BACKOFFICE',
        data: price,
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }

  async updateSubscriptionPrice(
    updateSubscriptionBackofficeDto: UpdateSubscriptionBackofficeDto,
  ) {
    try {
      let subscription;
      let price;
      const stripe = new Stripe(process.env.STRIPE, {
        apiVersion: '2022-08-01',
      });
 console.log('11',);
 
      // check duration : Interval = 'day' | 'month' | 'week' | 'year';
      if (updateSubscriptionBackofficeDto.duration == 'MONTHLY') {
        // create price
     
        price = await stripe.prices.create({
          unit_amount: updateSubscriptionBackofficeDto.amount + ((updateSubscriptionBackofficeDto.amount*20)/100),
          currency: `${updateSubscriptionBackofficeDto.currency}`,
          recurring: { interval: `month` },
          product_data: { name: `price_1Lb3SIAjRu3zL9rviWypSAcc` },
        });
      }
      console.log('price',);
      if (updateSubscriptionBackofficeDto.duration == 'YEARLY') {
        // create price
        price = await stripe.prices.create({
          unit_amount: updateSubscriptionBackofficeDto.amount + ((updateSubscriptionBackofficeDto.amount*20)/100),
          currency: `${updateSubscriptionBackofficeDto.currency}`,
          recurring: { interval: `year` },
          product_data: { name: `price_1Lb3SIAjRu3zL9rviWypSAcc` },
        });
      }

      // fetch payements and update their price
      let payments: any = await this.payementService.getAllPayement(
        updateSubscriptionBackofficeDto.duration,
        updateSubscriptionBackofficeDto._id,
        updateSubscriptionBackofficeDto.priceToUpdate,
      );

      let subscriptionArray = payments.map(
        (payment) => payment.stripe_data?.data?.object?.subscription,
      );
    //sub_1M6bc2AjRu3zL9rvjZl6SZzw
      const results = subscriptionArray.filter((element) => {
      //  console.log(element);
        
        return element !== undefined && element.toString() != 'sub_1MmIzOAjRu3zL9rvEBeTCNwc' &&
          element.toString() != 'sub_1M6bc2AjRu3zL9rvjZl6SZzw'&&
          element.toString() != 'sub_1ME9WcAjRu3zL9rv7X13uStQ'
          && element.toString() != 'sub_1MsjKQAjRu3zL9rvtXyScCHS'&&
          element.toString() != 'sub_1MED7vAjRu3zL9rvaMcaRB8g'&&
          element.toString() != 'sub_1MEDJ7AjRu3zL9rvqy7nbFC'
          &&
          element.toString() != 'sub_1MEDJ7AjRu3zL9rvqy7nbFCQ'
      });
console.log(results);
  const res=[]
      for (let i = 0; i < results.length; i++) {
        subscription = await stripe.subscriptions.retrieve(`${results[i]}`);
        // console.log("subscription");
          
        if (subscription.status != 'active') continue;
      //  console.log(subscription.items?.data[0].id);
        
        if (subscription.items?.data[0].id) {
         const res= await stripe.subscriptions.update(results[i], {
            cancel_at_period_end: false,
            proration_behavior: 'create_prorations',
            items: [
              {
                id: subscription.items?.data[0].id,
                price: `${price.id}`,
              },
            ],
          });
          if (res) {
           // console.log('22222222222222', res);
            
          } else {
            console.log('rrre');
          }
        }
      }

     

      // update price in collection payment -> mongodb
      let updatePayement;
      let subscriptionUpdate;
      let subscriptionIdArray = payments.map((payment) => String(payment._id));
      for (let i = 0; i < subscriptionIdArray.length; i++) {
        updatePayement = await this.payementService.updatePayementAmount(
          subscriptionIdArray[i],
          updateSubscriptionBackofficeDto.amount,
        );
      }

      // update price in collection subscription -> mongodb
      switch (updateSubscriptionBackofficeDto.attributeNameToUpdateId) {
        // code block
        case 'monthly_payment_id': {
          console.log('monthly_payment_id');
          subscriptionUpdate = await this.subscriptionModel.findOneAndUpdate(
            { _id: updateSubscriptionBackofficeDto._id },
            {
              monthly_payment: updateSubscriptionBackofficeDto.amount,
              monthly_payment_id: price.id,
            },
            { new: true },
          );
          break;
        }
        case 'monthly_payment_with_extra_id': {
          // code block
          console.log('monthly_payment_with_extra_id');
          subscriptionUpdate = await this.subscriptionModel.findOneAndUpdate(
            { _id: updateSubscriptionBackofficeDto._id },
            {
              monthly_payment_extras: updateSubscriptionBackofficeDto.amount,
              monthly_payment_with_extra_id: price.id,
            },
            { new: true },
          );
          break;
        }
        case 'yearly_payment_id': {
          // code block
          console.log('yearly_payment_id');

          subscriptionUpdate = await this.subscriptionModel.findOneAndUpdate(
            { _id: updateSubscriptionBackofficeDto._id },
            {
              yearly_payment: updateSubscriptionBackofficeDto.amount,
              yearly_payment_id: price.id,
            },
            { new: true },
          );
          break;
        }
     //  
        case 'yearly_payment_with_extra_id': {
          // code block
          console.log('yearly_payment_with_extra_id');

          subscriptionUpdate = await this.subscriptionModel.findOneAndUpdate(
            { _id: updateSubscriptionBackofficeDto._id },
            {
              yearly_payment_extras: updateSubscriptionBackofficeDto.amount,
              yearly_payment_with_extra_id: price.id,
            },
            { new: true },
          );
          break;
        }
        default:
          break;
        // code block
      }

      // push price and previous price
      payments.push({
        newPrice: price.id,
        previousPrice: updateSubscriptionBackofficeDto.priceToUpdate,
      });

      return {
        statusCode: 201,
        message: 'API.CREATE.PRICE.SUBSCRIPTION.BACKOFFICE',
        data: payments,
      };
    } catch (error) {
      console.log('updateSubscriptionPrice error : ', error);
      return {
        statusCode: 400,
        message: 'API.BAD.REQUEST',
        data: null,
      };
    }
  }


  async deleteBackofficePro(deleteUserDto: DeleteUserDto) {
    const data = await this.userModel.deleteOne({
      _id: deleteUserDto.id,
    });
    console.log('delete event pack :', data);
    return {
      statusCode: 200,
      message: 'API.DELETE.BACKOFFICE.USER',
      data,
    };
  }

  async getOnlyAnnuaireService(page_number, page_size, toSearch) {
    console.log(toSearch);

    // const data = await this.userModel.find({ addedByAdmin: true, })
    let query = {};
    if (toSearch) {
      query = {
        $and: [
          {
            addedByAdmin: true,
            active: true,
          },
          {
            $or: [
              {
                firstName: {
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
              {
                lastName: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                email: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                jobTitle: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                address: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                phoneNumber: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
              {
                city: {
                  $regex: new RegExp(`${toSearch}`),
                  $options: 'i',
                },
              },
            ],
          },
        ],
      };
    } else {
      query = {
        addedByAdmin: true,
        active: true,
      };
    }

    const resultLen = (await this.userModel.find(query)).length;
    const result = await this.userModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(page_number && page_size ? (+page_number - 1) * +page_size : 0)
      .limit(page_number && page_size ? +page_size : 10);
    console.log('heeeeeeere',resultLen);

    return {
      statusCode: 200,
      message: SUCCEEDED,
      data: result,
      page_number,
      page_size,
      total_attributs: resultLen,
    };
  }

  //! -----------------------------------------------sprint2
}
