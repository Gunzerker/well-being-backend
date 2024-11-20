import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, InternalServerErrorException, MethodNotAllowedException, UnauthorizedException } from '@nestjs/common';
import { User } from '../users/models/user.model';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { INVALID_TOKEN_CREDENTIALS } from 'src/constantes/constantes';
import { privilege } from 'src/shared/enums';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: process.env.JWT_SECRET,
    });
  }
  //!geetting some informations from JWT especially the _id
  //!...
  async validate(payload: any) {
    try {
      const user = await this.userModel.findOne({
        _id: payload._id
      });
      if (user.active == false)
        throw new MethodNotAllowedException()
      if (!user) throw new UnauthorizedException();
      //? i can return any inforamtion about the user

      await user.populate(['subscription', 'relatedCompany']);
      if (payload.role == privilege.ADMIN) {
        return {
          _id: payload._id,
          sub: null,
          role: payload.role,
        };
      }
      if (payload.role == privilege.EMPLOYEE) {
        return {
          _id: payload._id,
          sub: null,
          role: payload.role,
        };
      }

      if (user.subscription == null) {
        return {
          _id: payload._id,
          sub: null,
          role: payload.role,
        };
      } else {
        return {
          _id: payload._id,
          sub: user.subscription.name.toString().toLocaleUpperCase(),
          role: payload.role,
        };
      }
    } catch (e) {
      console.log(e);
      if (e.status == 405)
        throw new MethodNotAllowedException()
      throw new UnauthorizedException();
    }
  }
}
