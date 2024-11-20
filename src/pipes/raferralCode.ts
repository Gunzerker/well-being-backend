import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterUserDto } from 'src/api/auth/dto/createUserDto';
import { User } from 'src/api/users/models/user.model';
import { INVALID_REFRRELCODE } from 'src/constantes/constantes';

@Injectable()
export class ReferralCodePipe implements PipeTransform {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async transform(value: RegisterUserDto, metadata: ArgumentMetadata) {
    if (value.jointByreferralCode) {
      {
        const existe = await this.userModel.findOne({
          referralCode: value.jointByreferralCode,
        });

        if (existe) {
          return value;
        } else {
          throw new HttpException(
            INVALID_REFRRELCODE,
            HttpStatus.NON_AUTHORITATIVE_INFORMATION,
          );
        }
      }
    }
    return value;
  }

  // value.jointByreferralCode;
}
