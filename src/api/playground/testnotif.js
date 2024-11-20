var admin = require('firebase-admin');
const serviceAccount = require('../../config/env/firebase.json');
const axios = require('axios');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
async function send_notification(title, body, data) {
  try {
    let message = {
      data,
    };
    const options = {
      priority: 'high',
      timeToLive: 60 * 60 * 24,
    };
    let registrationTokenIOS =
      'fQXSeJJzjUd_sOi7UmL_3a:APA91bEdLZByhAODgKiyKQWGKfCBoO1YJwDpNGAn9He4vyivbFquzy3ciu-KZGiEFg3Md5W1mbVBNy9z7zzS9MulM84bNbzp3245iQcmiEBXp13k7B1U9OPMDAgQBgBjwWw3DDGJ1rbw';
    //message.notification = { title, body };
    let registrationTokenANDROID = "c6OnxFKiSqKt6Pu5SBT7uw:APA91bHLO8kt_L2Rs_8lv4uaNHSt7rTqZzwO5pa_duq--w4QkB2TeiPekoIDnyYZDEDiThf2E58QU0UbhvE_k-iNm7BxdOY0AExcZzp1pD42hY1IIUOa-p8mOVZG7_DzNirH4JbdkMXU";
    //fetch the user token
    
    data.payload = JSON.stringify(data);
    const send = {
      // timeToLive: 60 * 60 * 24,
      notification: { title: 'digitu', body: 'feechr' },
      data,
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          },
        },
      },
      token: registrationTokenIOS,
    };
    admin
      .messaging()
      .send(send)
      .then((response) => {
        // Response is a message ID string.
        console.log(response.results);
        console.log('Successfully sent message: ', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
  } catch (e) {
    console.log(e);
  }
}
admin
  .appCheck()
  .verifyToken(
    'fQXSeJJzjUd_sOi7UmL_3a:APA91bEdLZByhAODgKiyKQWGKfCBoO1YJwDpNGAn9He4vyivbFquzy3ciu-KZGiEFg3Md5W1mbVBNy9z7zzS9MulM84bNbzp3245iQcmiEBXp13k7B1U9OPMDAgQBgBjwWw3DDGJ1rbw',
  );
// send_notification('test1', 'test', { test: 'test' });
