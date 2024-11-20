import { ApiProperty } from '@nestjs/swagger';

export class ConfigNotifications {
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  c_notif_for_appointemnt_accepted: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  ep_notif_ask_for_demande: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  a_notif_before_appointment: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  a_notif_new_rating: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  a_notif_prestation_finished: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  p_notif_payment: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  p_notif_new_event_signup: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  pc_notif_posp_or_dec_appointment: Boolean;
  @ApiProperty({ required: false, nullable: true, type: Boolean })
  c_notif_begin_event_soon: Boolean;
}
