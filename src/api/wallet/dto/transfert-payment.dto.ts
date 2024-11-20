import { ApiProperty } from "@nestjs/swagger";

export class TransfertPaymentDto {
  @ApiProperty()
  amount: Number;
}
