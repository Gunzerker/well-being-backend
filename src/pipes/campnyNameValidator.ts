import {
  ArgumentMetadata,
  BadRequestException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterUserDto } from 'src/api/auth/dto/createUserDto';
import { User } from 'src/api/users/models/user.model';
import {
  INVALID_CREDENTIALS,
  SOME_CREDENTIALS_INVALID,
} from 'src/constantes/constantes';
import { privilege } from 'src/shared/enums';
import { apiReturner } from 'src/shared/returnerApi';

@Injectable()
export class CompanyNameValidatorPipe implements PipeTransform {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async transform(value: RegisterUserDto, metadata: ArgumentMetadata) {
    if (value.type == privilege.PRO && value.companyName == null) {
      throw new BadRequestException(INVALID_CREDENTIALS);
    } else if (value.type == privilege.CLIENT) {
      return value;
      // value.jointByreferralCode;
    }
    return value;
  }
}
