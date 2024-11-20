export async function fetchTwilioRoomStatus (sid) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);
 return await client.video.v1.rooms(sid).fetch();
}