import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { colors, typography, spacing, radius } from '../../src/theme/tokens';
import { PostCard } from '../../src/components/PostCard';
import { getPublicFeed, getFollowingFeed, getFollowedUids, likePost, unlikePost, getUserProfile } from '../../src/services/social';
import type { Post, UserProfile } from '../../src/types/models';

type FeedMode = 'public' | 'following';

export default function FeedScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<FeedMode>('public');
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const uid = getAuth().currentUser?.uid;

  const loadFeed = useCallback(async () => {
    let fetchedPosts: Post[];
    if (mode === 'public') {
      fetchedPosts = await getPublicFeed();
    } else {
      if (!uid) return;
      const followed = await getFollowedUids(uid);
      fetchedPosts = await getFollowingFeed(followed);
    }
    setPosts(fetchedPosts);

    // autoren nachladen für anzeige (name/foto), dedupliziert
    const uniqueUids = [...new Set(fetchedPosts.map((p) => p.uid))];
    const profiles = await Promise.all(uniqueUids.map((u) => getUserProfile(u)));
    const authorMap: Record<string, UserProfile> = {};
    profiles.forEach((p) => {
      if (p) authorMap[p.uid] = p;
    });
    setAuthors(authorMap);
  }, [mode, uid]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  async function handleLikeToggle(postId: string) {
    if (!uid) return;
    const isLiked = likedPostIds.has(postId);
    const updated = new Set(likedPostIds);
    if (isLiked) {
      updated.delete(postId);
      await unlikePost(postId, uid);
    } else {
      updated.add(postId);
      await likePost(postId, uid);
    }
    setLikedPostIds(updated);
    // optimistisches like-count update lokal
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likeCount: p.likeCount + (isLiked ? -1 : 1) } : p))
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabSwitch}>
        <Pressable
          style={[styles.switchButton, mode === 'public' && styles.switchButtonActive]}
          onPress={() => setMode('public')}
        >
          <Text style={[styles.switchText, mode === 'public' && styles.switchTextActive]}>alle</Text>
        </Pressable>
        <Pressable
          style={[styles.switchButton, mode === 'following' && styles.switchButtonActive]}
          onPress={() => setMode('following')}
        >
          <Text style={[styles.switchText, mode === 'following' && styles.switchTextActive]}>folge ich</Text>
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.thermalOrange} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {mode === 'following' ? 'folge ein paar piloten, um hier was zu sehen' : 'noch keine flüge geteilt'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            authorName={authors[item.uid]?.displayName ?? '...'}
            authorPhotoUrl={authors[item.uid]?.photoUrl ?? null}
            isLiked={likedPostIds.has(item.id)}
            onLikeToggle={() => handleLikeToggle(item.id)}
            onCommentPress={() => router.push(`/post/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDeep,
  },
  tabSwitch: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  switchButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.skySurface,
  },
  switchButtonActive: {
    backgroundColor: colors.thermalOrange,
  },
  switchText: {
    fontFamily: typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  switchTextActive: {
    color: colors.skyDeep,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontFamily: typography.body,
    color: colors.textTertiary,
  },
});
