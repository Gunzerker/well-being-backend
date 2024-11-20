import { ApiProperty } from '@nestjs/swagger';
import {
  SubscriptionName,
  Dimensionnement,
  Visibility,
  Fonctionality,
} from 'src/back-office/models/subscription.model';

export class CreateSubscriptionDto {
  @ApiProperty()
  name: string;
  @ApiProperty({ isArray: true, type: SubscriptionName })
  subscriptionName: [SubscriptionName];
  @ApiProperty()
  monthly_payment: number;
  @ApiProperty()
  monthly_payment_extras: number;
  @ApiProperty()
  yearly_payment: number;
  @ApiProperty()
  yearly_payment_extras: number;
  monthly_payment_id: string;
  yearly_payment_id: string;
  monthly_payment_with_extra_id: string;
  yearly_payment_with_extra_id: string;
  @ApiProperty()
  visibility: Visibility;
  @ApiProperty()
  fonctionality: Fonctionality;
  @ApiProperty()
  illimited_teams: boolean;
  availabe_team: number;
  @ApiProperty({ isArray: true, type: Dimensionnement })
  dimensionnement: [Dimensionnement];
}

export class TestCreateSubscriptionDto {
  @ApiProperty()
  name: string;
  @ApiProperty({ isArray: true, type: SubscriptionName })
  subscriptionName: [SubscriptionName];
  @ApiProperty()
  monthly_payment: number;
  @ApiProperty()
  monthly_payment_extras: number;
  @ApiProperty()
  yearly_payment: number;
  @ApiProperty()
  yearly_payment_extras: number;
  monthly_payment_id: string;
  yearly_payment_id: string;
  monthly_payment_with_extra_id: string;
  yearly_payment_with_extra_id: string;
  @ApiProperty()
  visibility: Visibility;
  @ApiProperty()
  fonctionality: Fonctionality;
  @ApiProperty()
  illimited_teams: boolean;
  availabe_team: number;
  @ApiProperty({ isArray: true, type: Dimensionnement })
  dimensionnement: [Dimensionnement];
}

export class TestUpdateSubscriptionDto {
  @ApiProperty({ required: false })
  name: string;

  @ApiProperty({ required: false })
  monthly_payment: number;
  @ApiProperty({ required: false })
  monthly_payment_extras: number;
  @ApiProperty({ required: false })
  yearly_payment: number;
  @ApiProperty({ required: false })
  yearly_payment_extras: number;
  @ApiProperty({ required: false })
  illimited_teams: boolean;
  @ApiProperty({ required: false })
  availabe_team: number;

  @ApiProperty({ required: false })
  monthly_payment_id: string;
  @ApiProperty({ required: false })
  yearly_payment_id: string;
  @ApiProperty({ required: false })
  monthly_payment_with_extra_id: string;
  @ApiProperty({ required: false })
  yearly_payment_with_extra_id: string;
}
