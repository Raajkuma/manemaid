import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon3D } from '@/components/ui';
import { APP_VERSION } from '@/lib/config';
import { fonts, gradients, space } from '@/lib/theme';

/** Full-screen "Update the app" / "Under maintenance" screens, driven by live config. */
export function GateScreen({
  kind,
  message,
  onStaffSignIn,
  onSignOut,
}: {
  kind: 'update' | 'maintenance';
  message: string;
  onStaffSignIn?: () => void;
  onSignOut?: () => void;
}) {
  const update = kind === 'update';
  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: space.xl, justifyContent: 'center', alignItems: 'center', gap: space.lg }}>
        <Icon3D name={update ? 'cloud-download' : 'construct'} tone={update ? 'blue' : 'orange'} size={84} float />
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 28, color: '#fff', textAlign: 'center' }}>
          {update ? 'Update ManeMaid' : 'We’ll be right back'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: 'rgba(255,255,255,0.88)', textAlign: 'center', maxWidth: 360 }}>
          {message}
        </Text>
        <View style={{ alignSelf: 'stretch', gap: space.sm, maxWidth: 360, width: '100%', marginTop: space.md }}>
          {update && Platform.OS === 'android' ? (
            <Button label="Open Play Store" icon="logo-google-playstore" onPress={() => void Linking.openURL('market://details?id=com.manemaid.app')} />
          ) : null}
          {onStaffSignIn ? <Button label="Agency staff sign in" variant="secondary" icon="log-in" onPress={onStaffSignIn} /> : null}
          {onSignOut ? <Button label="Sign out" variant="secondary" icon="log-out" onPress={onSignOut} /> : null}
        </View>
        {update ? <Text style={{ fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Installed version {APP_VERSION}</Text> : null}
      </SafeAreaView>
    </LinearGradient>
  );
}
