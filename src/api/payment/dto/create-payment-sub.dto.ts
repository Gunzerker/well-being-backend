import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SubLengthEnum {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY"
}

export class CreatePaymentSubDto {
  //@ApiProperty()
  //@IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  readonly userId: String;
  @IsNotEmpty()
  @ApiProperty()
  readonly subId: String;
  @ApiProperty({
    enum: SubLengthEnum,
  })
  @IsEnum(SubLengthEnum)
  readonly type: SubLengthEnum;
  @ApiProperty()
  extra: Boolean;
  @ApiProperty()
  coupon: string;
}

export class turnoverByProDto {
  @ApiProperty()
  readonly userId: string;
  @ApiProperty()
  readonly year: number;
  @ApiProperty()
  readonly month: number;
}

export class createCouponDto {
  @ApiProperty()
  readonly to: [string];
  @ApiProperty()
  readonly subscriptions: [string];
  @ApiProperty()
  readonly code: string;
  @ApiProperty()
  readonly percent_off: number;
  @ApiProperty()
  readonly expires_at: string;
  @ApiProperty()
  readonly name: string;
  @ApiProperty()
  readonly duration: string;

  @ApiProperty()
  readonly couponName: string;

  @ApiProperty()
  readonly couponId: string;
  
  

}
