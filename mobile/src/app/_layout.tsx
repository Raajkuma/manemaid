import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { useFonts } from 'expo-font';
import { usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { GateScreen } from '@/components/app-gate';
import { PopupProvider } from '@/components/popup';
import { stackOptions } from '@/components/ui';
import { APP_VERSION, ConfigProvider, isOlder, useAppConfig } from '@/lib/config';
import { installErrorReporting, setErrorRoute } from '@/lib/errors';
import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();
installErrorReporting();

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, profile, loading } = useSession();
  const ready = fontsReady && !loading;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = !!session && !!profile;
  return (
    <ConfigProvider signedIn={signedIn}>
      <GatedNavigator signedIn={signedIn} />
    </ConfigProvider>
  );
}

/** Live config can force an app update, or pause the app for customers (maintenance). */
function GatedNavigator({ signedIn }: { signedIn: boolean }) {
  const { isAgency, signOut } = useSession();
  const config = useAppConfig();
  const [staffSignIn, setStaffSignIn] = useState(false);
  const pathname = usePathname();
  useEffect(() => setErrorRoute(pathname), [pathname]);

  if (isOlder(APP_VERSION, config.minVersion)) {
    return <GateScreen kind="update" message={config.updateMessage} />;
  }
  // Agency staff and developers keep working during maintenance (they need to check things).
  if (config.maintenance.enabled && !isAgency && !(staffSignIn && !signedIn)) {
    return (
      <GateScreen
        kind="maintenance"
        message={config.maintenance.message}
        onStaffSignIn={signedIn ? undefined : () => setStaffSignIn(true)}
        onSignOut={signedIn ? () => void signOut() : undefined}
      />
    );
  }

  // Each user sees exactly one area of the app, chosen by their role in the
  // database (profiles.role) — never by anything the client sets.
  // Send anyone who lands on a screen they can't use to their own home, rather than
  // letting the router pick the first open screen (that gave "/legal" or an
  // unmatched "/(admin)" URL on web).
  const home = !signedIn ? '/sign-in' : isAgency ? '/queue' : '/';
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Protected guard={signedIn && !isAgency} redirectTo={home}>
        <Stack.Screen name="(customer)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && isAgency} redirectTo={home}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo={home}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Screen
        name="legal"
        options={{ ...stackOptions, headerShown: true, title: 'Terms & Privacy', presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return (
    <SessionProvider>
      <PopupProvider>
        <StatusBar style="dark" />
        {/* If fonts fail to load we still start, with system fonts. */}
        <RootNavigator fontsReady={fontsLoaded || !!fontError} />
      </PopupProvider>
    </SessionProvider>
  );
}
