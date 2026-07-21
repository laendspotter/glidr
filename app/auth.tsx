import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, typography, spacing, radius } from '../src/theme/tokens';
import { signInWithApple, signInWithGoogleIdToken, useGoogleAuthConfig } from '../src/services/auth';
import { useEffect } from 'react';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, response, promptGoogleAsync] = useGoogleAuthConfig();

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      handleGoogleToken(response.authentication.idToken);
    }
  }, [response]);

  async function handleGoogleToken(idToken: string) {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogleIdToken(idToken);
    } catch (e) {
      setError('anmeldung fehlgeschlagen, versuch es nochmal');
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setLoading(true);
    setError(null);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError('anmeldung fehlgeschlagen, versuch es nochmal');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>glidr</Text>
        <Text style={styles.subtitle}>flieg. teil. verbinde dich.</Text>
      </View>

      <View style={styles.buttons}>
        {loading ? (
          <ActivityIndicator color={colors.thermalOrange} size="large" />
        ) : (
          <>
            <Pressable
              style={styles.googleButton}
              onPress={() => promptGoogleAsync()}
              disabled={!request}
            >
              <Text style={styles.googleButtonText}>mit google anmelden</Text>
            </Pressable>

            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={radius.md}
                style={styles.appleButton}
                onPress={handleApple}
              />
            )}
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDeep,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.display,
    fontSize: 48,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  buttons: {
    gap: spacing.md,
  },
  googleButton: {
    backgroundColor: colors.skySurface,
    borderWidth: 1,
    borderColor: colors.skyBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  googleButtonText: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  appleButton: {
    height: 50,
  },
  error: {
    fontFamily: typography.body,
    color: colors.dangerSink,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
