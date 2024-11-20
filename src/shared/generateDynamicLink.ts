import axios from 'axios';
import { emailtype } from './enums';
export function dynamicLink(
  data: any,
  target: any,
  resource: any,
  emailtype?: string,
  toEmp?: boolean,
) {
  if (emailtype == 'PASS') {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await axios.post(
          `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${process.env.FIREBASE_API_KEY}`,

          {
            dynamicLinkInfo: {
              domainUriPrefix: process.env.FIREBASE_DOMAIN_PREFIX,
              link: process.env.F_URL + `${resource}?${target}=${data}`,
              iosInfo: {
                iosBundleId: process.env.IOS_BUNDLE_NAME,
                iosAppStoreId: process.env.IOS_APPSTORE_ID,
              },
              androidInfo: {
                androidPackageName: process.env.ANDROID_PACKAGE_NAME,
              },
              navigationInfo: {
                enableForcedRedirect: true,
              },
            },
          },
        );
        return resolve(result.data.shortLink);
      } catch (err: unknown) {
        console.log(err);
        return reject(err);
      }
    });
  } else if (emailtype == 'ACC') {
    const url =
      process.env.F_URL +
      `${resource}?${target[0]}=${data.token}&${target[1]}=${
        data.user.firstName
      }${data.user.type == 'PRO' ? '&user_id=' + data.user._id : ''}`;
    return new Promise(async (resolve, reject) => {
      try {
        const result = await axios.post(
          `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${process.env.FIREBASE_API_KEY}`,

          {
            dynamicLinkInfo: {
              domainUriPrefix: process.env.FIREBASE_DOMAIN_PREFIX,
              link: url,
              iosInfo: {
                iosBundleId: process.env.IOS_BUNDLE_NAME,
                iosAppStoreId: process.env.IOS_APPSTORE_ID,
              },
              androidInfo: {
                androidPackageName: process.env.ANDROID_PACKAGE_NAME,
              },
              navigationInfo: {
                enableForcedRedirect: true,
              },
            },
          },
        );
        return resolve(result.data.shortLink);
      } catch (err: unknown) {
        console.log(err);
        return reject(err);
      }
    });
  } else if (emailtype == 'LEADS') {
    const url =
      process.env.F_URL +
      `${resource}?${target[0]}=${data[0]}&${target[1]}=${data[1]}`;
    return new Promise(async (resolve, reject) => {
      try {
        const result = await axios.post(
          `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${process.env.FIREBASE_API_KEY}`,

          {
            dynamicLinkInfo: {
              domainUriPrefix: process.env.FIREBASE_DOMAIN_PREFIX,
              link: url,
              iosInfo: {
                iosBundleId: process.env.IOS_BUNDLE_NAME,
                iosAppStoreId: process.env.IOS_APPSTORE_ID,
              },
              androidInfo: {
                androidPackageName: process.env.ANDROID_PACKAGE_NAME,
              },
              navigationInfo: {
                enableForcedRedirect: true,
              },
            },
          },
        );
        return resolve(result.data.shortLink);
      } catch (err: unknown) {
        console.log(err);
        return reject(err);
      }
    });
  } else {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await axios.post(
          `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${process.env.FIREBASE_API_KEY}`,

          {
            dynamicLinkInfo: {
              domainUriPrefix: process.env.FIREBASE_DOMAIN_PREFIX,
              link: process.env.F_URL + `${resource}?${target}=${data}`,
              iosInfo: {
                iosBundleId: process.env.IOS_BUNDLE_NAME,
                iosAppStoreId: process.env.IOS_APPSTORE_ID,
              },
              androidInfo: {
                androidPackageName: process.env.ANDROID_PACKAGE_NAME,
              },
              navigationInfo: {
                enableForcedRedirect: true,
              },
            },
          },
        );
        return resolve(result.data.shortLink);
      } catch (err: unknown) {
        console.log(err);
        return reject(err);
      }
    });
  }
}
