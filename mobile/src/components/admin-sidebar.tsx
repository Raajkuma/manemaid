import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { useUnreadCount } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';

type Item = { href: Href; label: string; icon: IconName; /** Paths (prefixes) that belong to this section. */ match: string[] };

const ITEMS: Item[] = [
  { href: '/queue', label: 'Work queue', icon: 'file-tray-full-outline', match: ['/queue', '/manage', '/send-quote', '/propose-staff'] },
  { href: '/tickets', label: 'Support', icon: 'chatbubbles-outline', match: ['/tickets', '/ticket'] },
  { href: '/staff', label: 'Staff', icon: 'people-outline', match: ['/staff'] },
  { href: '/alerts', label: 'Inbox', icon: 'notifications-outline', match: ['/alerts'] },
  { href: '/account', label: 'Account', icon: 'settings-outline', match: ['/account', '/templates', '/agency-settings', '/legal'] },
];

function isActive(path: string, item: Item) {
  return item.match.some((m) => path === m || path.startsWith(m + '/') || path.startsWith(m + '-'));
}

/**
 * Desktop-browser navigation for the agency. Stays visible on every agency page
 * (queue, booking, staff profile, forms...), unlike the phone's bottom tabs.
 */
export function AdminSidebar() {
  const path = usePathname();
  const { session } = useSession();
  const unread = useUnreadCount(session?.user.id);

  return (
    <SafeAreaView edges={['top', 'bottom', 'left']} style={s.bar}>
      <View style={s.brand}>
        <View style={s.logo}>
          <Ionicons name="home" size={18} color="#fff" />
        </View>
        <View>
          <Text style={s.brandName}>ManeMaid</Text>
          <Text style={s.brandSub}>Agency console</Text>
        </View>
      </View>
      <View accessibilityRole="tablist" style={{ gap: 2 }}>
        {ITEMS.map((item) => {
          const active = isActive(path, item);
          const icon = (active ? item.icon.replace('-outline', '') : item.icon) as IconName;
          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => router.navigate(item.href)}
              // `hovered` is only reported on web (react-native-web).
              style={(state) => [s.item, active ? s.itemActive : (state as { hovered?: boolean }).hovered ? s.itemHover : null]}
            >
              <Ionicons name={icon} size={20} color={active ? colors.primary : colors.muted} />
              <Text style={[s.label, active ? { color: colors.primary, fontFamily: fonts.bold } : null]}>{item.label}</Text>
              {item.label === 'Inbox' && unread > 0 ? (
                <View style={s.count}>
                  <Text style={s.countText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bar: { width: 232, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.line, paddingHorizontal: space.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingTop: space.lg, paddingBottom: space.xl },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: fonts.heading, fontSize: 16, color: colors.ink },
  brandSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: 11, borderRadius: radius.md },
  itemActive: { backgroundColor: colors.primarySoft },
  itemHover: { backgroundColor: colors.canvas },
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#fff', fontFamily: fonts.bold, fontSize: 11 },
});
