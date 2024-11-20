import { User } from 'src/api/users/models/user.model';
import { privilege } from 'src/shared/enums';

export const debugingEmail = (userdata: any, userlogged: any) => `
<html><head></head><body>
<br>
<br>
<br>
<br>
<br>
<br>
<center>
<b>
${userdata}
<br></center>
<br>
${userlogged}
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>

------------------------------------------------------
<br>
Veuillez cliquer ci-dessous pour confirmer votre compte
<br>
Si vous n'avez pas fait cette demande, veuillez ignorer cet e-mail.
<br>
<br>
</body>`;
// <a href="${process.env.URL_ACCOUNT_VERIF}&name=${user.firstName}">${
//   process.env.URL_ACCOUNT_VERIF + generateRereferralCode(23)
// }</a>
