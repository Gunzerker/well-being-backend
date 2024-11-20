import { ApiProperty } from '@nestjs/swagger';
import { status } from 'src/shared/enums';

export class QuotationDto {
  @ApiProperty()
  description: string;
  @ApiProperty({ required: false, type: Boolean })
  onLineMeeting: boolean;
  @ApiProperty()
  at_home: boolean;
  @ApiProperty()
  at_business: boolean;
}
export class ReplyQuotationDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: false,
    required: true,
  })
  devis: Express.Multer.File;
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    required: false,
  })
  join: Express.Multer.File;
  @ApiProperty({ required: false })
  duration?: number;
  @ApiProperty({ required: true })
  name: string;
  @ApiProperty({ required: false })
  comment?: string;
  @ApiProperty({
    required: false,
    type: String,
    enum: status,
    default: status.PENDING,
  })
  status: status;
  @ApiProperty({ required: false, type: Boolean })
  onLineMeeting: boolean;
  @ApiProperty({ required: false, type: Number })
  fee: number;
}
export class QuotationReplyDto {
  @ApiProperty({ required: false })
  duration: number;
  @ApiProperty({ required: true })
  name: string;
  @ApiProperty({ required: false })
  comment: string;
  @ApiProperty({ required: false, type: Boolean, default: false })
  onLineMeeting: boolean;
  @ApiProperty({ required: false, type: Number })
  fee: number;
}
