import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { privilege } from 'src/shared/enums';
import { SignInUserDto } from './dto/signIn.tdo';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(
    email: string,
    password: string,
    notificationDeviceToken: string,
    platform: string
  ): Promise<any> {
    const user = await this.authService.validateUser({
      email,
      password,
      notificationDeviceToken,
      platform
    });
    if (!user || user.data.active.toString() == 'false') {
      throw new UnauthorizedException();
    }
    return user;
  }
}
