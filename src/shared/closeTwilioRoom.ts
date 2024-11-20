export async function closeTwilioRoom(uniqueName) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);
  const room_status = await client.video.v1.rooms(uniqueName).update({ status: "completed" })
  return room_status;
}


