import { MongooseModule } from '@nestjs/mongoose';
import { Subscription } from 'rxjs';
import {
  Category,
  CategorySchema,
} from 'src/api/category/schemas/category.entity';
import { Company, CompanySchema } from 'src/api/companies/company.models';
import { Events, EventsSchema, TheNext, TheNextSchema } from 'src/api/events/schemas/event.entity';
import {
  Favourite,
  favouriteSchema,
} from 'src/api/favourite/models/favourite.model';
import {
  Prestation,
  prestationSchema,
} from 'src/api/prestation/models/prestation.model';
import {
  Quotation,
  quotationSchema,
} from 'src/api/quotation/model/model.quotation';
import {
  AgendaUser,
  agendaUserSchema,
} from 'src/api/users/models/agenda.user.model';
import { User, UserSchema } from 'src/api/users/models/user.model';
import { Gpp, GppSchema } from 'src/back-office/models/gpp2';

import {
  SubscriptionSchema,
  TestSubscription,
  TestSubscriptionSchema,
} from 'src/back-office/models/subscription.model';

export const mongooseModuleConfig = MongooseModule.forFeature([
  { name: Company.name, schema: CompanySchema },
  { name: User.name, schema: UserSchema },
  { name: Category.name, schema: CategorySchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: Gpp.name, schema: GppSchema },
  { name: Prestation.name, schema: prestationSchema },
  { name: Quotation.name, schema: quotationSchema },
  { name: TestSubscription.name, schema: TestSubscriptionSchema },
  { name: Favourite.name, schema: favouriteSchema },
  { name: Events.name, schema: EventsSchema },
  { name: AgendaUser.name, schema: agendaUserSchema },
  { name: TheNext.name, schema: TheNextSchema }
]);
