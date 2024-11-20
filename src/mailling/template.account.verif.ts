import { User } from 'src/api/users/models/user.model';
import { privilege } from 'src/shared/enums';

export const emailTemplateaccountVerif = (
  user: User,
  shortlink: any,
  shortLinkWeb: string,
  employeePass?: string,
) => `
<html><head></head><body>
Bonjour (M/Mme) ${user.firstName},
<br>
Veuillez cliquer ci-dessous pour confirmer votre compte
<br>
Si vous n'avez pas fait cette demande, veuillez ignorer cet e-mail.
<br>
Sinon, veuillez cliquer sur ce lien pour confirmer votre compte :
<br>
${
  user.type == privilege.EMPLOYEE
    ? 'votre mot de passe (M/Mme) ' + user.firstName + ' : ' + '<b>'+employeePass+'</b>'
    : ''
}
 
<br>

<b>Mobile : </b>
<br>
<a style="font-weight:bold" href=${
  user.type == privilege.EMPLOYEE ||
  user.type == privilege.PRO ||
  user.type == privilege.CLIENT
    ? shortlink
    : ''
}> Cliquez-ici  </a>
<br>
<b>Web :  </b>
<br>
<a style="font-weight:bold" href=${
  user.type == privilege.EMPLOYEE ||
  user.type == privilege.PRO ||
  user.type == privilege.CLIENT
    ? shortLinkWeb
    : ''
  }>
Cliquez-ici 
</a>

</body>`;
// <a href="${process.env.URL_ACCOUNT_VERIF}&name=${user.firstName}">${
//   process.env.URL_ACCOUNT_VERIF + generateRereferralCode(23)
// }</a>

/* temporary removed for mobile */

// <b>Web :  </b>
// <br>
// <a href=${
//   user.type == privilege.EMPLOYEE ||
//   user.type == privilege.PRO ||
//   user.type == privilege.CLIENT
//     ? shortLinkWeb
//     : ''
// }>${
//   user.type == privilege.EMPLOYEE ||
//   user.type == privilege.PRO ||
//   user.type == privilege.CLIENT
//     ? shortLinkWeb
//     : ''
// }</a>
