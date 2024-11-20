import { User } from 'src/api/users/models/user.model';

export const emailTemplateConfirm = (
  user: User,
  shortLinkWeb?: string,
  shortlink?: any,
) => `
<html><head></head><body>
Bonjour (M/Mme) ${user.firstName},
<br>
Une demande de changement de mot de passe a été effectuée.
<br>
Si vous n’êtes pas à l’origine de cette dernière, veuillez ignorer cet e-mail.
<br>
Dans le cas contraire, cliquez sur le lien ci-dessous pour modifier votre mot de passe.
<br>

<br>




<b>Mobile :</b>
<br>
<a style="font-weight:bold" href=${shortlink}> Cliquez-ici </a>
<br>

<b>web :</b>
<br>
<a href=${shortLinkWeb}> Cliquez-ici </a>
<br>
</body>`;
