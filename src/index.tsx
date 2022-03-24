import {
  // NativeModules, Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL } from 'react-native-url-polyfill';
/*
const LINKING_ERROR =
  `The package 'react-native-goaffpro-mobile-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const GoaffproMobileSdk = NativeModules.GoaffproMobileSdk
  ? NativeModules.GoaffproMobileSdk
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );
 */
let publicToken: string;
let xConfig: GoaffproConfig;
let logging = false;

enum LinkAttribution {
  last_touch,
  first_touch = 'first_touch',
  first_touch_nonblocking = 'first_touch_nonblocking',
}

interface GoaffproConfig {
  cookie_duration: number;
  identifiers: Array<string>;
  remove_tracking_after_order: boolean;
  link_attribution: LinkAttribution;
}
const defaultConfig: GoaffproConfig = {
  cookie_duration: 7 * 24 * 60 * 60 * 1000,
  identifiers: ['ref'],
  remove_tracking_after_order: false,
  link_attribution: LinkAttribution.last_touch,
};
function log(message: string) {
  if (logging) console.log('Goaffpro:', message);
}
function error(message: string) {
  if (logging) console.error('Goaffpro:', message);
}

async function setItem(key: string, value: string) {
  try {
    return AsyncStorage.setItem(String(key), String(value));
  } catch (e) {
    return null;
  }
}
async function getItem(key: string) {
  try {
    return AsyncStorage.getItem(String(key));
  } catch (e) {
    return null;
  }
}

const storageKeys = {
  ref: '@ref',
  refTime: '@refTime',
  visitId: '@gfp_v_id',
  affiliateId: '@affiliate_id',
};

async function removeItem(key: string) {
  try {
    return AsyncStorage.removeItem(String(key));
  } catch (e) {
    return null;
  }
}

Linking.addEventListener('url', function ({ url }) {
  log('received URL');
  processURL(url).then(() => {
    log('URL processed');
  });
});

export function setLogging(shouldLogToConsole: boolean) {
  logging = shouldLogToConsole;
}

/**
 * Initializes the Goaffpro SDK.
 * Call it when your app launches.
 * @param {string} xGoaffproPublicToken
 * @param {GoaffproConfig} config
 */
export async function init(
  xGoaffproPublicToken: string,
  config?: GoaffproConfig
) {
  publicToken = xGoaffproPublicToken;
  const url = await Linking.getInitialURL();
  await setConfig(config);
  await processURL(url);
  await trackPageView();
  return {
    success: 1,
    ref_code: await getReferralCode(),
  };
}
async function processURL(url: string | null) {
  if (url) {
    const o = new URL(url).search;
    const ref = searchInQuery(xConfig ? xConfig.identifiers : ['ref'], o);
    if (ref) {
      const link_attribution = xConfig && xConfig.link_attribution;
      if (link_attribution === 'first_touch') {
        const oldRef = await getReferralCode();
        if (!oldRef) await setReferralCode('organic');
      } else if (link_attribution === 'first_touch_nonblocking') {
        const oldRef = await getReferralCode();
        if (!oldRef) await setReferralCode(ref);
      } else {
        await setReferralCode(ref);
      }
    }
  }
  if (xConfig && xConfig.link_attribution === 'first_touch') {
    const oldRef = await getReferralCode();
    if (!oldRef) await setReferralCode('organic');
  }
}

export function getPublicToken() {
  return publicToken;
}
export function getConfig() {
  return xConfig;
}

/**
 * @param identifiers
 * @param searchQuery
 * @return {string | null}
 */
function searchInQuery(identifiers: Array<string>, searchQuery: string) {
  if (!identifiers || identifiers.length === 0) return null;
  var query = searchQuery;
  if (query.length > 0) {
    var parts = query
      .substring(1)
      .split('&')
      .map(function (item: string) {
        return item.split('=');
      });
    var ident = identifiers.map(function (item) {
      return item.toLowerCase().trim();
    });
    var refparts = parts.find(function (part: string[]) {
      return ident.indexOf(part[0].toLowerCase()) > -1;
    });
    if (refparts) {
      return refparts[1];
    }
  }
  return null;
}

async function setConfig(config?: GoaffproConfig) {
  if (config) {
    xConfig = config;
  } else {
    xConfig = await fetch('https://api.goaffpro.com/v1/sdk/config.json', {
      headers: {
        'x-goaffpro-public-token': publicToken,
      },
    })
      .then((data) => data.json())
      .then(
        ({
          first_touch_or_last,
          identifiers,
          cookie_duration,
          remove_tracking_post_order,
        }) => {
          return {
            cookie_duration,
            identifiers,
            remove_tracking_after_order: remove_tracking_post_order,
            link_attribution: first_touch_or_last,
          };
        }
      )
      .catch((e) => {
        error(e.response.data);
        error('using default config. xPublicToken is invalid');
        return defaultConfig;
      });
  }
  return Promise.resolve(xConfig);
}

export async function getReferralCode() {
  const [ref, refTime] = await Promise.all([
    getItem(storageKeys.ref),
    getItem(storageKeys.refTime),
  ]);
  if (refTime) {
    if (xConfig && Date.now() - Number(refTime) > xConfig.cookie_duration) {
      await Promise.all([
        removeItem(storageKeys.ref),
        removeItem(storageKeys.refTime),
        removeItem(storageKeys.visitId),
      ]);
      return null;
    }
  }
  return ref;
}

export function isInitialized() {
  return !!xConfig;
}

export async function setReferralCode(referralCode: string) {
  const ref = await getItem(storageKeys.ref);
  if (!ref || ref !== referralCode) {
    await setItem(storageKeys.ref, referralCode);
    await setItem(storageKeys.refTime, String(Date.now()));
    await removeItem(storageKeys.visitId);
  }
}

/**
 * Tracks the page-views for the affiliate
 * Does nothing in case the customer did not use the affiliate's referral link
 */
export async function trackPageView() {
  const ref = await getReferralCode();
  if (!ref) return Promise.resolve();
  if (!publicToken) {
    error(
      'Goaffpro SDK is not initialized. Please init the SDK before calling trackPageView method'
    );
    return Promise.resolve({
      error:
        'Goaffpro SDK is not initialized. Please init the SDK before calling trackPageView method',
    });
  }
  const gfp_v_id = await getItem(storageKeys.visitId);
  // do the api call;
  const { id, affiliate_id } = await fetch(
    'https://api.goaffpro.com/v1/sdk/track/visit',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goaffpro-public-token': publicToken,
      },
      body: JSON.stringify({ ref, id: gfp_v_id }),
    }
  ).then((data) => data.json());
  if (id) {
    await setItem(storageKeys.visitId, String(id));
  }
  if (affiliate_id) {
    await setItem(storageKeys.affiliateId, String(affiliate_id));
  }
  return {
    id,
    affiliate_id,
  };
}

interface Customer {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
}

interface LineItem {
  name: string;
  quantity: number;
  price: number;
  sku?: string;
  product_id?: string;
  tax?: number;
  discount?: number;
}

interface Order {
  id?: string;
  number?: string;
  total?: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  currency?: string;
  date?: Date;
  customer?: Customer;
  line_items?: Array<LineItem>;
  coupons?: Array<string>;
}
/**
 * Attributes the sale to the affiliate.
 * Call this method with order data when the customer completes the order
 * @param {Order | string} order
 * @return Promise<object> Object returning the result of the call
 */
export async function trackConversion(order: Order | string) {
  if (!publicToken) {
    error(
      'Goaffpro SDK is not initialized. Please init the SDK before calling trackConversion method'
    );
    return Promise.resolve({
      error:
        'Goaffpro SDK is not initialized. Please init the SDK before calling trackConversion method',
    });
  }

  const ref = await getReferralCode();
  const gfp_v_id = ref ? await getItem(storageKeys.visitId) : null;
  // const affiliate_id =  await AsyncStorage.getItem('@affiliate_id');
  // do the api call;
  return fetch('https://api.goaffpro.com/v1/sdk/track/conversion', {
    method: 'POST',
    headers: {
      'x-goaffpro-public-token': publicToken,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      data: order,
      ref,
      visit_id: gfp_v_id,
    }),
  })
    .then((d) => d.json())
    .then((data) => {
      return Promise.all([
        xConfig.remove_tracking_after_order
          ? removeItem(storageKeys.ref)
          : Promise.resolve(),
        xConfig.remove_tracking_after_order
          ? removeItem(storageKeys.refTime)
          : Promise.resolve(),
        xConfig.remove_tracking_after_order
          ? removeItem(storageKeys.affiliateId)
          : Promise.resolve(),
        removeItem(storageKeys.visitId),
      ]).then(() => data);
    })
    .catch(() => false);
}

interface AffiliatePublicProfile {
  name: string;
  coupon: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string;
  companyName: string;
  bio: string;
}

/**
 * Retrieve details about the current affiliate.
 * Call this method in order to retrieve detail about the affiliate
 * @param {string} referralCode - referralCode parameter is optional. If not provided, the call will be made with current referral-code
 * @return Promise<AffiliatePublicProfile | null>
 */
export async function getAffiliateDetails(
  referralCode?: string
): Promise<AffiliatePublicProfile | null> {
  const ref_code = referralCode || (await getReferralCode());
  if (ref_code) {
    const response = await fetch(
      'https://api.goaffpro.com/v1/sdk/affiliate?fields=name,first_name,last_name,comments,profile_photo,company_name,coupon&ref_code=' +
        encodeURIComponent(ref_code),
      {
        headers: {
          'x-goaffpro-public-token': publicToken,
          'content-type': 'application/json',
        },
      }
    ).then((data) => data.json());
    return {
      bio: response.comments,
      name: response.name,
      firstName: response.fname,
      lastName: response.lname,
      profilePhotoUrl: response.profile_photo,
      companyName: response.company_name,
      coupon: response.coupon,
    };
  }
  return null;
}
