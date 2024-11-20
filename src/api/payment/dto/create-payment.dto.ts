import { ApiProperty } from "@nestjs/swagger";

class AssignedEmployees {
  @ApiProperty()
  to : String
}

class PrestationObject {
  @ApiProperty()
  prestationId: String;
  @ApiProperty()
  online: boolean;
  @ApiProperty()
  at_home: boolean;
  @ApiProperty()
  at_business: boolean;
}
export class CreatePaymentDto {
  //@ApiProperty()eventId, prestationId, to, assigned_employees
  //@IsEmail()
  //@IsNotEmpty()
  @ApiProperty()
  readonly to: String;
  @ApiProperty()
  readonly eventId: String;
  @ApiProperty()
  readonly is_online : Boolean
  @ApiProperty()
  readonly quotationId: String;
  @ApiProperty()
  readonly eventPackId: String;
  @ApiProperty({ type: PrestationObject, nullable: true, isArray: true })
  prestationId: [PrestationObject];
  @ApiProperty()
  readonly startDate: String;
  @ApiProperty({ type: AssignedEmployees, nullable: true, isArray: true })
  assigned_employees: [AssignedEmployees];
  @ApiProperty()
  readonly subId: String;
  @ApiProperty()
  readonly subLength: String;

  
}
