export async function createTwilioRoom (uniqueName) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);
    try{
      const room = await client.video.v1.rooms.create({
        uniqueName,
        maxParticipantDuration: 86400,
      });
      return room
    }catch(err){
      console.log(err)
    }
}