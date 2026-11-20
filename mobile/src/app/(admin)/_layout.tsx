import { Stack } from 'expo-router/stack';

import { stackOptions } from '@/components/ui';

export default function AdminLayout() {
  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="manage/[id]" options={{ title: 'Booking' }} />
      <Stack.Screen name="send-quote" options={{ title: 'Send quotation', presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="propose-staff" options={{ title: 'Propose staff' }} />
      <Stack.Screen name="staff-profile/[id]" options={{ title: 'Staff profile' }} />
      <Stack.Screen name="staff-form" options={{ title: 'Staff details', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="templates" options={{ title: 'Scope templates' }} />
      <Stack.Screen name="agency-settings" options={{ title: 'Agency settings' }} />
      <Stack.Screen name="ticket/[id]" options={{ title: 'Support request' }} />
    </Stack>
  );
}
