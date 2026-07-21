import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { Send, ChevronLeft } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../../src/theme/tokens';
import { getComments, addComment, getUserProfile } from '../../src/services/social';
import type { Comment, UserProfile } from '../../src/types/models';

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const uid = getAuth().currentUser?.uid;

  const loadComments = useCallback(async () => {
    if (!postId) return;
    const fetched = await getComments(postId);
    setComments(fetched);

    const uniqueUids = [...new Set(fetched.map((c) => c.uid))];
    const profiles = await Promise.all(uniqueUids.map((u) => getUserProfile(u)));
    const authorMap: Record<string, UserProfile> = {};
    profiles.forEach((p) => {
      if (p) authorMap[p.uid] = p;
    });
    setAuthors(authorMap);
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSend() {
    if (!uid || !postId || !input.trim()) return;
    setSending(true);
    await addComment(postId, uid, input.trim());
    setInput('');
    await loadComments();
    setSending(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: 'kommentare',
          headerStyle: { backgroundColor: colors.skyDeep },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>noch keine kommentare — schreib den ersten</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Text style={styles.commentAuthor}>{authors[item.uid]?.displayName ?? '...'}</Text>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="kommentar schreiben..."
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Send size={18} color={colors.skyDeep} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDeep,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontFamily: typography.body,
    color: colors.textTertiary,
  },
  commentRow: {
    backgroundColor: colors.skySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commentAuthor: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 13,
    marginBottom: 4,
  },
  commentText: {
    fontFamily: typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.skyBorder,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.skySurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.thermalOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
