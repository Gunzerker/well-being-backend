import { MailerService } from '@nestjs-modules/mailer';
import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { referralCodeSenderDto } from 'src/api/auth/dto/createUserDto';
import { User } from 'src/api/users/models/user.model';
import { SOMETHING_WENT_WRONG, SUCCEEDED } from 'src/constantes/constantes';
import { emailtype, privilege } from 'src/shared/enums';
import { dynamicLink } from 'src/shared/generateDynamicLink';
import { apiReturner } from 'src/shared/returnerApi';
import { debugingEmail } from './debug.email';
import { emailPokePro, emailPokeProAdmin } from './tamplate.poke.pro';
import { emailTemplateaccountVerif } from './template.account.verif';
import { emailTemplateConfirm } from './template.forget.pass';
import { emailReferralCodeSender } from './template.referralCode.sender';
import { simpleEmailtoInform } from './template.simple.email';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) { }

  async sendEmailForForgettenPassword(user: User, token: string) {
    try {
      const shortlink = await dynamicLink(
        token,
        'token',
        'reset-password',
        emailtype.PASS,
      );
      const locale=user["userLocale"]?user["userLocale"]:"fr"
      const shortLinkWeb =
        process.env.F_URL +locale+'/reinitialiser-mot-de-passe?token=' + token;

      await this.mailerService.sendMail({
        from: 'application.bien-etre@beyang.io',
        to: user.email,
        subject: 'Bienvenue sur beYANG ! réinitialisation de votre mot de passe',
        html: emailTemplateConfirm(user, shortLinkWeb, shortlink),
      });

      return { message: 'Please check your Email box !' };
    } catch (e) {
      console.log('mail not sent');
    }
  }

  async sendEmailToInform(whosReferral: User, beneficiary: User) {
    try {
      await this.mailerService.sendMail({
        from: 'application.bien-etre@beyang.io',
        to: whosReferral.email,
        subject:
          whosReferral.type == privilege.PRO &&
            beneficiary.type == privilege.PRO
            ? 'Félicitation ! 🎉🎉 (M/Mme) ' +
            whosReferral.firstName +
            ' ' +
            whosReferral.lastName
            : "L'équipe Beyang vous remercie beaucoup 🙏🙏 (M/Mme) ",
        html: simpleEmailtoInform(whosReferral, beneficiary),
      });
    } catch (e) {
      console.log('mail not sent');
    }
  }

  async sendEmailForAccountVerification(
    user: User,
    token: string,
    employeePass?: string,
  ) {
    try {
      const target = ['token', 'name'];
      const data = { user, token };
      let shortlink;
      let shortLinkWeb;

      if (user.type != privilege.EMPLOYEE) {
        // shortlink = await dynamicLink(
        //   data,
        //   target,
        //   'inscription/succes',
        //   emailtype.ACC,
        // );
        const locale=user["userLocale"]?user["userLocale"]:"fr"
        shortLinkWeb =
          process.env.F_URL +
          locale+'/inscription/succes?' +
          target[0] +
          '=' +
          data.token +
          '&' +
          target[1] +
          '=' +
          data.user.firstName;
      } else {
        // shortlink = await dynamicLink(
        //   data,
        //   target,
        //   'nouvel/employe',
        //   emailtype.ACC,
        // );
        const locale=user["userLocale"]?user["userLocale"]:"fr"
        shortLinkWeb =
          process.env.F_URL +locale+
          '/connexion' 
         
      }

      console.log(user.type, shortlink);

      const email = await this.mailerService.sendMail({
        from: 'application.bien-etre@beyang.io',
        to: user.email,
        subject: 'Bienvenue sur beYANG ! confirmation du compte ',
        html: emailTemplateaccountVerif(
          user,
          shortlink,
          shortLinkWeb,
          employeePass,
        ),
      });
      console.log('em', email);

      return { message: 'Please check your Email box !' };
    } catch (e) {
      console.log('mail not sent');
    }
  }

  async sendEmailForReferralCode(
    email: string[],
    referralCodeLink: string,
    shortLinkWeb: string,
    referralCode: string
  ) {
    try {
      const isDone = await Promise.all(
        email.map(async (email) => {
          return await this.mailerService.sendMail({
            from: 'application.bien-etre@beyang.io',
            to: email,
            subject: 'Bienvenue sur beYANG ! Invitation ✉️',
            html: emailReferralCodeSender(
              email.split('@')[0],
              referralCodeLink || 'test',
              shortLinkWeb,
              referralCode
            ),
          });
        }),
      );
      if (isDone) {
        return apiReturner(HttpStatus.OK, SUCCEEDED);
      } else {
        throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
      }
    } catch (e) {
      console.log(e);
      console.log('mail not sent');
    }
  }
  async onSendEmailForProPoke(
    poked: User,
    user: User,
    shortlink: string,
    shortLinkWeb: string,
  ) {
    try {
      return await this.mailerService.sendMail({
        from: 'application.bien-etre@beyang.io',
        to: poked.email,
        subject: 'Bienvenue sur beYANG ! Invitation',
        html: emailPokePro(
          poked,
          user,
          shortlink,
          shortLinkWeb,
        ),
      });
    } catch (e) {
      console.log('mail not sent');
    }
  }

  async onSendEmailForProPokeAdmin(
    email: string,
    userwhos: User,
    wasPoke: User,
  ) {
    try {
      return await this.mailerService.sendMail({
        from: 'application.bien-etre@beyang.io',
        to: email,
        subject: 'Bienvenue sur beYANG ! Invitation envoyée',
        html: emailPokeProAdmin(
          email.split('@')[0].toUpperCase(),
          userwhos,
          wasPoke
        ),
      });
    } catch (e) {
      console.log('mail not sent');
    }
  }

}
