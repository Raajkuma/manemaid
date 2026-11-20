import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useTabBarOptions } from '@/components/ui';
import { useUnreadCount } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function AdminTabs() {
  const { session } = useSession();
  const unread = useUnreadCount(session?.user.id);
  const tabBarOptions = useTabBarOptions();

  return (
    <Tabs screenOptions={{ ...tabBarOptions, animation: 'shift' }}>
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
