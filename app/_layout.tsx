import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { subscribeToAuthChanges } from '../src/services/auth';
import { registerForPushNotifications } from '../src/services/pushNotifications';
import type { User } from 'firebase/auth';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(setUser);
    return unsub;
  }, []);

  useEffect(() => {
    if (user) {
      registerForPushNotifications(user.uid).catch(() => {
        // push ist ein nice-to-have, kein blocker falls's fehlschlägt (z.b. simulator)
      });
    }
  }, [user]);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.skyDeep }}>
        <ActivityIndicator color={colors.thermalOrange} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="post/[postId]" options={{ headerShown: true, presentation: 'card' }} />
          </>
        ) : (
          <Stack.Screen name="auth" />
        )}
      </Stack>
    </>
  );
}
