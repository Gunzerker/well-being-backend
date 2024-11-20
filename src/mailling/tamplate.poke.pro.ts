import { User } from 'src/api/users/models/user.model';

export const emailPokePro = (
  poked: User,
  user: User,
  shortlink: any,
  shortLinkWeb: any,
) => `
<html><head></head><body>

Bonjour (M/Mme) ${poked?.lastName.toUpperCase()}.${poked?.firstName.toUpperCase()},
<br>
Vous avez reçu une invitation de (M/Mme) ${user.lastName.toUpperCase()} ${user.firstName.toUpperCase()} à rejoindre BeYANG le réseau des professionnels du bien-être !
<br>
<br>
Testez gratuitement l'appli avec le pack "DISCOVER" pendant 15 jours ou choisissez le plan tarifaire correspondant à la taille de votre entreprise et à vos ambitions.
<br>
<br>
A vous de jouer!
<br>
<br>
<br>
<b>Depuis votre mobile:</b>
<br>
<a style="font-weight:bold" href=${shortlink}>Cliquez-ici</a>
<br>
<b>Nos offres:</b>
<br>
<a href='https://beyang.fr/tarifs-professionnels-bien-etre/'>https://beyang.fr/tarifs-professionnels-bien-etre/</a>

<br>
<br>

L'équipe BeYANG







</body>`;

//
//
//

export const emailPokeProAdmin = (
  lebel: string,
  userwhosPocke: User,
  userWasPocke: User
) => `
<html><head></head><body>
Bonjour beYANG,
<br>(M/Mme) <b>${userwhosPocke.lastName.toLocaleUpperCase()} ${userwhosPocke.firstName} - ${userwhosPocke.email}</b> a envoyé une invitation à (M/Mme) <b>${userWasPocke.lastName.toLocaleUpperCase()} ${userWasPocke.firstName} - ${userWasPocke.email}</b> pour rejoindre la communauté beYANG 

</body>`;