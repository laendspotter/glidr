import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Gauge, Mountain, Clock } from 'lucide-react-native';
import { colors, typography, spacing, radius, shadow } from '../theme/tokens';
import { getFlight } from '../services/social';
import type { Post, Flight } from '../types/models';

interface Props {
  post: Post;
  authorName: string;
  authorPhotoUrl: string | null;
  isLiked: boolean;
  onLikeToggle: () => void;
  onCommentPress: () => void;
}

export function PostCard({ post, authorName, authorPhotoUrl, isLiked, onLikeToggle, onCommentPress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {authorPhotoUrl ? (
          <Image source={{ uri: authorPhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{authorName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.authorName}>{authorName}</Text>
      </View>

      {post.photoUrls.length > 0 && (
        <Image source={{ uri: post.photoUrls[0] }} style={styles.photo} />
      )}

      {post.type === 'flight' && post.flightId && <FlightStatsRow flightId={post.flightId} />}

      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={onLikeToggle}>
          <Heart
            size={20}
            color={isLiked ? colors.thermalOrange : colors.textSecondary}
            fill={isLiked ? colors.thermalOrange : 'transparent'}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onCommentPress}>
          <MessageCircle size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FlightStatsRow({ flightId }: { flightId: string }) {
  const [flight, setFlight] = useState<Flight | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFlight(flightId).then((f) => {
      if (!cancelled) setFlight(f);
    });
    return () => {
      cancelled = true;
    };
  }, [flightId]);

  if (!flight) {
    // skeleton während des ladens statt "--" platzhalter, fühlt sich weniger kaputt an
    return (
      <View style={styles.statsRow}>
        <View style={[styles.statItem, styles.statSkeleton]} />
        <View style={[styles.statItem, styles.statSkeleton]} />
        <View style={[styles.statItem, styles.statSkeleton]} />
      </View>
    );
  }

  const durationMin = Math.round(flight.durationSec / 60);

  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Gauge size={16} color={colors.thermalOrange} />
        <Text style={styles.statText}>{flight.distanceKm.toFixed(1)} km</Text>
      </View>
      <View style={styles.statItem}>
        <Mountain size={16} color={colors.airspaceBlue} />
        <Text style={styles.statText}>{Math.round(flight.maxAltitudeM)} m</Text>
      </View>
      <View style={styles.statItem}>
        <Clock size={16} color={colors.textSecondary} />
        <Text style={styles.statText}>{durationMin} min</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.skySurface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
  },
  avatarFallback: {
    backgroundColor: colors.thermalOrangeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
  },
  authorName: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  photo: {
    width: '100%',
    height: 280,
    backgroundColor: colors.skyBorder,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statSkeleton: {
    width: 60,
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.skyBorder,
  },
  statText: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.textPrimary,
  },
  caption: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
