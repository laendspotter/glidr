import { View, Text, StyleSheet, Pressable, TextInput, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Radio, Send } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../../src/theme/tokens';
import { db, storage } from '../../src/services/firebase';
import { getUserProfile } from '../../src/services/social';
import { startWatchingForTakeoff, getCurrentState } from '../../src/services/flightTracker';
import type { Post, UserProfile } from '../../src/types/models';

export default function UploadScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [caption, setCaption] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    if (uid) getUserProfile(uid).then(setProfile);
  }, [uid]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  function handleStartWatching() {
    if (!uid || !profile?.gliderRegistration) return;
    startWatchingForTakeoff({
      uid,
      displayName: profile.displayName,
      gliderRegistration: profile.gliderRegistration,
      onStateChange: (state) => setWatching(state !== 'idle'),
    });
    setWatching(true);
  }

  async function handlePostText() {
    if (!uid || (!caption.trim() && !photoUri)) return;
    setSubmitting(true);

    let photoUrls: string[] = [];
    if (photoUri) {
      const uploadedUrl = await uploadPhoto(uid, photoUri);
      photoUrls = [uploadedUrl];
    }

    const postRef = doc(collection(db, 'posts'));
    const post: Post = {
      id: postRef.id,
      uid,
      type: 'text',
      flightId: null,
      caption: caption.trim(),
      photoUrls,
      likeCount: 0,
      commentCount: 0,
      createdAt: Date.now(),
    };
    await setDoc(postRef, post);

    setCaption('');
    setPhotoUri(null);
    setSubmitting(false);
  }

  async function uploadPhoto(uid: string, uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const path = `posts/${uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <View style={styles.trackingCard}>
        <View style={styles.trackingHeader}>
          <Radio size={20} color={watching ? colors.thermalOrange : colors.textSecondary} />
          <Text style={styles.trackingTitle}>flug tracken</Text>
        </View>

        {!profile?.gliderRegistration ? (
          <Text style={styles.trackingHint}>
            leg zuerst deine flugzeug-kennung im profil fest, um live-tracking zu nutzen
          </Text>
        ) : watching ? (
          <View style={styles.watchingState}>
            <Text style={styles.watchingText}>wartet auf start · {profile.gliderRegistration}</Text>
          </View>
        ) : (
          <Pressable style={styles.trackButton} onPress={handleStartWatching}>
            <Text style={styles.trackButtonText}>bereit zum fliegen</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>oder direkt posten</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.photoPicker} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Camera size={28} color={colors.textTertiary} />
            <Text style={styles.photoPlaceholderText}>foto hinzufügen</Text>
          </View>
        )}
      </Pressable>

      <TextInput
        style={styles.captionInput}
        placeholder="was gibt's zu erzählen?"
        placeholderTextColor={colors.textTertiary}
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <Pressable
        style={[styles.postButton, submitting && styles.postButtonDisabled]}
        onPress={handlePostText}
        disabled={submitting || (!caption.trim() && !photoUri)}
      >
        <Send size={18} color={colors.skyDeep} />
        <Text style={styles.postButtonText}>{submitting ? 'wird gepostet...' : 'posten'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDeep,
  },
  trackingCard: {
    backgroundColor: colors.skySurface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trackingTitle: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  trackingHint: {
    fontFamily: typography.body,
    color: colors.textTertiary,
    fontSize: 13,
    lineHeight: 18,
  },
  trackButton: {
    backgroundColor: colors.thermalOrange,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  trackButtonText: {
    fontFamily: typography.bodySemibold,
    color: colors.skyDeep,
    fontSize: 15,
  },
  watchingState: {
    backgroundColor: colors.thermalOrangeMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  watchingText: {
    fontFamily: typography.mono,
    color: colors.textPrimary,
    fontSize: 13,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.skyBorder,
  },
  dividerText: {
    fontFamily: typography.body,
    color: colors.textTertiary,
    fontSize: 12,
  },
  photoPicker: {
    marginBottom: spacing.md,
  },
  photoPlaceholder: {
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.skySurface,
    borderWidth: 1,
    borderColor: colors.skyBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoPlaceholderText: {
    fontFamily: typography.body,
    color: colors.textTertiary,
    fontSize: 13,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
  },
  captionInput: {
    backgroundColor: colors.skySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  postButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.thermalOrange,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontFamily: typography.bodySemibold,
    color: colors.skyDeep,
    fontSize: 15,
  },
});
