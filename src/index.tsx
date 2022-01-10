import { NativeModules, Platform, Linking } from 'react-native';
const queryString = require('query-string');
import AsyncStorage from '@react-native-async-storage/async-storage';

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

var publicToken: string;

export function multiply(a: number, b: number): Promise<number> {
  return GoaffproMobileSdk.multiply(a, b);
}

export async function init(xGoaffproPublicToken: string) {
  publicToken = xGoaffproPublicToken;
  const url = await Linking.getInitialURL();
  if (url) {
    const o = queryString.parse(url);
    if (o && o.ref) {
      const ref = o.ref;
      await setReferralCode(ref);
    }
  }
}

export async function setReferralCode(referralCode: string) {
  const ref = await AsyncStorage.getItem('@ref');
  if (!ref || ref !== referralCode) {
    await AsyncStorage.setItem('@ref', referralCode);
    await AsyncStorage.removeItem('@gfp_v_id');
  }
}

/**
 * Tracks the page for the affiliate's visit.
 */
export async function trackPageView() {
  const ref = await AsyncStorage.getItem('@ref');
  const gfp_v_id = await AsyncStorage.getItem('@gfp_v_id');

  // do the api call;
  const { id, affiliate_id } = await fetch(
    'https://api.goaffpro.com/sdk/track/visit',
    {
      headers: {
        'x-goaffpro-public-token': publicToken,
      },
      body: JSON.stringify({ ref, id: gfp_v_id }),
    }
  ).then((data) => data.json());
  if (id) {
    await AsyncStorage.setItem('@gfp_v_id', id);
  }
  if (affiliate_id) {
    await AsyncStorage.setItem('@affiliate_id', affiliate_id);
  }
}

interface Customer {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface LineItem {
  name: string;
  quantity: number;
  price: number;
  sku: string;
  product_id: string;
  tax: number;
  discount: number;
}

interface Order {
  id: string;
  number: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  currency: string;
  date: Date;
  customer: Customer;
  line_items: Array<LineItem>;
}
/**
 * @param {Order} order
 */
export async function trackConversion(order: Order) {
  const ref = await AsyncStorage.getItem('@ref');
  const gfp_v_id = await AsyncStorage.getItem('@gfp_v_id');
  //  const affiliate_id =  await AsyncStorage.getItem('@affiliate_id');

  // do the api call;
  const { id, affiliate_id } = await fetch(
    'https://api.goaffpro.com/sdk/track/conversion',
    {
      headers: {
        'x-goaffpro-public-token': publicToken,
      },
      body: JSON.stringify({
        data: order,
        ref,
        visit_id: gfp_v_id,
      }),
    }
  ).then((data) => data.json());
  if (id) {
    await AsyncStorage.setItem('@gfp_v_id', id);
  }
  if (affiliate_id) {
    await AsyncStorage.setItem('@affiliate_id', affiliate_id);
  }
}
export async function getCouponCode() {}
