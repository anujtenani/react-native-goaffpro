import { useEffect } from 'react';
import { Linking } from 'react-native';
import { processURL } from 'react-native-goaffpro';

export default function useGoaffproLinkingListener() {
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      processURL(url).then(() => {
        console.log('URL processed');
      });
    };
    const urlListener = Linking.addEventListener('url', handleUrl);
    return () => {
      urlListener.remove();
    };
  }, []);
}
