export async function generateTokenTwilio (payload) {

 const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
 const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
 const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
 const {
   jwt: { AccessToken },
 } = require('twilio');

 const VideoGrant = AccessToken.VideoGrant;

 // Create an access token which we will sign and return to the client,
 // containing the grant we just created.
 const token = new AccessToken(
   TWILIO_ACCOUNT_SID,
   TWILIO_API_KEY,
   TWILIO_API_SECRET,
 );

 // Assign the generated identity to the token.
 token.identity = String(payload.identity) + '_' + `${payload.firstName} ${payload.lastName}_${payload.profileImage?payload.profileImage:null}_${payload.type}`;

 // Grant the access token Twilio Video capabilities.
 const grant = new VideoGrant();
 token.addGrant(grant);

 // Serialize the token to a JWT string.
 return { user: token.identity, accessToken: token.toJwt() };
}