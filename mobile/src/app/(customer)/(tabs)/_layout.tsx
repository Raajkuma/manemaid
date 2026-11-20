import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useTabBarOptions } from '@/components/ui';
import { useUnreadCount } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function CustomerTabs() {
  const { session } = useSession();
  const unread = useUnreadCount(session?.user.id);
  const tabBarOptions = useTabBarOptions();

  return (
    <Tabs screenOptions={{ ...tabBarOptions, animation: 'shift' }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
          tabBarIcon: tabIcon('notifications-outline'),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }} />
    </Tabs>
  );
}
