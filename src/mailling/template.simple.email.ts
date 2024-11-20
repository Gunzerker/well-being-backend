import { User } from 'src/api/users/models/user.model';
import { privilege } from 'src/shared/enums';

export const simpleEmailtoInform = (whorefarrls: User, beneficiary: User) => `
<html><head></head><body>
<br>
<br>
<br>
<br>
<br>
<br>
<center>
<b>
${
  whorefarrls.type == privilege.PRO && beneficiary.type == privilege.PRO
    ? 'Félicitation ! 🎉🎉 (M/Mme) '
    : "L'équipe Beyang vous remercie beaucoup 🙏🙏 (M/Mme) "
}${whorefarrls.firstName}</b>,
<br>
<br>
<IMG SRC="https://c.tenor.com/6xEJJ5pjpcQAAAAC/felicitations.gif">
<br>
<br>
L ' utilisateur <b>${
  beneficiary.firstName
} ${beneficiary.lastName.toUpperCase()}</b> a inscrit à l'application grâce à votre code de parrainage
<br>
${
  whorefarrls.type == privilege.PRO && beneficiary.type == privilege.PRO
    ? 'suite à cette action vous avez bénéficié des 10 évènements gratuits !'
    : ''
}
<br></center>
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
