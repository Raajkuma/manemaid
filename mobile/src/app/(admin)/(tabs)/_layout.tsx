import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useIsWide, useTabBarOptions } from '@/components/ui';
import { useUnreadCount } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function AdminTabs() {
  const { session } = useSession();
  const unread = useUnreadCount(session?.user.id);
  const tabBarOptions = useTabBarOptions();
  // On wide screens the agency sidebar (see ../_layout.tsx) replaces the tab bar.
  const wide = useIsWide();
  const options = wide ? { ...tabBarOptions, tabBarPosition: 'bottom' as const, tabBarVariant: 'uikit' as const, tabBarStyle: { display: 'none' as const } } : tabBarOptions;

  return (
    <Tabs screenOptions={{ ...options, animation: 'shift' }}>
      <Tabs.Screen name="queue" options={{ title: 'Work queue', tabBarIcon: tabIcon('file-tray-full-outline') }} />
      <Tabs.Screen name="tickets" options={{ title: 'Support', tabBarIcon: tabIcon('chatbubbles-outline') }} />
      <Tabs.Screen name="staff" options={{ title: 'Staff', tabBarIcon: tabIcon('people-outline') }} />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Inbox',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
          tabBarIcon: tabIcon('notifications-outline'),
        }}
      />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: tabIcon('settings-outline') }} />
    </Tabs>
  );
}
