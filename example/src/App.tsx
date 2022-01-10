import * as React from 'react';
import { View, Text } from 'react-native';
/*
import {
  init,
  trackPageView,
  getConfig,
  getPublicToken,
  trackConversion,
  isInitialized,
} from 'react-native-goaffpro';
 */
export default function App() {
  // const [result, setResult] = React.useState<number | undefined>();

  React.useEffect(() => {
    /*
    init('my_storefront_token').then(() => {
      console.log({
        config: getConfig(),
        isInitialized: isInitialized(),
        publicToken: getPublicToken(),
      });
      trackConversion({
        id: '#1002',
        total: 200,
      }).then((result) => {
        console.log('conversion ok', result);
      });
    });

     */
  }, []);

  return (
    <View>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
      <Text>Result: is OK</Text>
    </View>
  );
}
