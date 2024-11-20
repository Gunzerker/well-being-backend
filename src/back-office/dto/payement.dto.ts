import { ApiProperty } from '@nestjs/swagger';
import {IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SubLengthEnum {
 MONTHLY = "MONTHLY",
 YEARLY = "YEARLY"
}

// export class CreatePaymentSubDto {
//   //@ApiProperty()
//   //@IsEmail()
//   @IsNotEmpty()
//   @ApiProperty()
//   readonly userId: String;
//   @IsNotEmpty()
//   @ApiProperty()
//   readonly subId: String;
//   @ApiProperty({
//     enum: SubLengthEnum,
//   })
//   @IsEnum(SubLengthEnum)
//   readonly type: SubLengthEnum;
//   @ApiProperty()
//   extra:Boolean
// }


export class UpdateSubscriptionBackofficeDto {
    @ApiProperty()
    _id: string;
    @ApiProperty()
    duration: string;
    @ApiProperty()
    currency: string;
    @ApiProperty()
    amount: number;
    @ApiProperty()
    priceToUpdate: string;
    @ApiProperty()
    attributeNameToUpdateId: string;

    
    // @ApiProperty()
    // jobTitle: string;
    // @ApiProperty()
    // profileImage: string;
    // @ApiProperty()
    // active: boolean;
    
  }
  
  
  
