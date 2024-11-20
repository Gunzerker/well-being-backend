import { ApiProperty } from '@nestjs/swagger';

export class CreateFavouriteDto {
  @ApiProperty()
  fromClient: string;
  @ApiProperty()
  toPro: string;
}
