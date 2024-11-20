export const emailReferralCodeSender = (
  email: string,
  referralCodeLink: any,
  shortLinkWeb,
  referralCode: string
) => `
<html><head></head><body>
Bonjour (M/Mme) ${email},
<br>
Merci de rejoindre la communauté BeYANG!
<br>
Votre code de parrainage pour 
<b>
 l'application mobile est: <b style="color:limegreen;">${referralCode}</b>
 </b>
<br>
Pour valider votre invitation, veuillez cliquer sur ce lien:
<br>
<b>Mobile:</b>
<br>
<a style="font-weight:bold" href=${referralCodeLink}>Cliquez-ici</a>
<br>
<b>Web:</b>
<br>
<a style="font-weight:bold" href=${shortLinkWeb}>Cliquez-ici</a>
<br>
</body>`;
