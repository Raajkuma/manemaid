import { Stack } from 'expo-router/stack';

import { stackOptions } from '@/components/ui';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-request" options={{ title: 'New request', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="address-form" options={{ title: 'Add address', presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Booking details' }} />
      <Stack.Screen name="offer/[id]" options={{ title: 'Offer' }} />
      <Stack.Screen name="support/index" options={{ title: '', headerTransparent: true, headerTintColor: '#fff', headerStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="support/new" options={{ title: 'New support request', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="support/[id]" options={{ title: 'Support request' }} />
    </Stack>
  );
}
