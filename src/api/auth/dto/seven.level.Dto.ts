import { ApiProperty } from '@nestjs/swagger';

class Certifications {
  @ApiProperty()
  syndicate_name: string;
  @ApiProperty()
  certificat_name: string;
}

export class LevelSevenDto {
  @ApiProperty({ isArray: true, type: Certifications })
  certifications: [Certifications];
}
