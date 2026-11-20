import { Linking } from 'react-native';

import { DEMO_MODE } from './supabase';

type Popup = {
  info: (o: { title: string; message?: string; icon?: 'call'; tone?: 'orange' }) => void;
  error: (title: string, e?: unknown) => void;
};

/**
 * Open a call / WhatsApp / SMS / email / UPI link.
 * In the offline demo these are switched off so nobody dials a real number or pays real money.
 */
export async function openLink(url: string, popup: Popup) {
  if (DEMO_MODE) {
    popup.info({
      title: 'Demo mode',
      message: 'Calls, WhatsApp, SMS, email and UPI payments are turned off in this demo. In the real app this would open your phone’s app.',
      icon: 'call',
      tone: 'orange',
    });
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    popup.error('Could not open', new Error('No app on this phone can open this.'));
  }
}
