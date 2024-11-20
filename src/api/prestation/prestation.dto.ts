import { ApiProperty } from '@nestjs/swagger';
import { Prestation } from './models/prestation.model';

export class CreatePrestationDto {
  @ApiProperty({ isArray: true, type: Prestation })
  listeOfPrestation: [Prestation];
}
