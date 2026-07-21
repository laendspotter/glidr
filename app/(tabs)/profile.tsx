import { View, Text, StyleSheet, Image, Pressable, TextInput, FlatList, Modal, Linking, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Settings, Trophy, Users, Gauge, Link2, Download, ExternalLink } from 'lucide-react-native';
import { colors, typography, spacing, radius, shadow } from '../../src/theme/tokens';
import { db } from '../../src/services/firebase';
import { getUserProfile } from '../../src/services/social';
import { searchClubs, getUserFlights, searchWeglideUser, getWeglideUploadUrl, type WeglideClub, type WeglideFlightSummary, type WeglideUser } from '../../src/services/weglide';
import { importWeglideFlightsSinceLinking } from '../../src/services/weglideImport';
import { signOut } from '../../src/services/auth';
import type { UserProfile } from '../../src/types/models';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weglideFlights, setWeglideFlights] = useState<WeglideFlightSummary[]>([]);
  const [clubModalVisible, setClubModalVisible] = useState(false);
  const [weglideModalVisible, setWeglideModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    getUserProfile(uid).then(setProfile);
  }, [uid]);

  useEffect(() => {
    if (profile?.weglideUserId) {
      getUserFlights(profile.weglideUserId).then(setWeglideFlights).catch(() => setWeglideFlights([]));
    }
  }, [profile?.weglideUserId]);

  async function handleClubSelect(club: WeglideClub) {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid), { clubId: String(club.id) });
    setProfile((prev) => (prev ? { ...prev, clubId: String(club.id) } : prev));
    setClubModalVisible(false);
  }

  async function handleWeglideLink(weglideUser: WeglideUser) {
    if (!uid) return;
    const linkedAt = Date.now();
    await updateDoc(doc(db, 'users', uid), { weglideUserId: weglideUser.id, weglideLinkedAt: linkedAt });
    setProfile((prev) => (prev ? { ...prev, weglideUserId: weglideUser.id, weglideLinkedAt: linkedAt } : prev));
    setWeglideModalVisible(false);
  }

  async function handleImportFlights() {
    if (!uid || !profile?.weglideUserId || !profile.weglideLinkedAt) return;
    setImporting(true);
    try {
      const count = await importWeglideFlightsSinceLinking(uid, profile.weglideUserId, profile.weglideLinkedAt);
      Alert.alert(
        count > 0 ? 'importiert' : 'nichts neues',
        count > 0 ? `${count} flug${count === 1 ? '' : 'flüge'} von weglide importiert` : 'keine neuen flüge seit der verknüpfung gefunden'
      );
    } catch {
      Alert.alert('fehler', 'import ist fehlgeschlagen, versuch es später nochmal');
    } finally {
      setImporting(false);
    }
  }

  function handleShareToWeglide() {
    Linking.openURL(getWeglideUploadUrl());
  }

  if (!profile) return null;

  const totalOlcPoints = weglideFlights.reduce((sum, f) => sum + f.points, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {profile.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{profile.displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        <Pressable style={styles.clubButton} onPress={() => setClubModalVisible(true)}>
          <Text style={styles.clubButtonText}>
            {profile.clubId ? 'verein ändern' : 'verein auswählen'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Users size={18} color={colors.airspaceBlue} />
          <Text style={styles.statValue}>{profile.followerCount}</Text>
          <Text style={styles.statLabel}>follower</Text>
        </View>
        <View style={styles.statCard}>
          <Gauge size={18} color={colors.thermalOrange} />
          <Text style={styles.statValue}>{profile.totalDistanceKm.toFixed(0)}</Text>
          <Text style={styles.statLabel}>km gesamt</Text>
        </View>
        <View style={styles.statCard}>
          <Trophy size={18} color={colors.successClimb} />
          <Text style={styles.statValue}>{totalOlcPoints.toFixed(0)}</Text>
          <Text style={styles.statLabel}>olc punkte</Text>
        </View>
      </View>

      {!profile.weglideUserId && (
        <Text style={styles.weglideHint}>
          verknüpfe dein weglide-konto in den einstellungen, um deine olc-wertung hier zu sehen
        </Text>
      )}

      {!profile.weglideUserId ? (
        <Pressable style={styles.weglideCard} onPress={() => setWeglideModalVisible(true)}>
          <Link2 size={18} color={colors.airspaceBlue} />
          <View style={styles.weglideCardText}>
            <Text style={styles.weglideCardTitle}>weglide-konto verknüpfen</Text>
            <Text style={styles.weglideCardHint}>olc-wertung sehen und flüge importieren</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.weglideActions}>
          <Pressable style={styles.weglideActionButton} onPress={handleImportFlights} disabled={importing}>
            <Download size={16} color={colors.textPrimary} />
            <Text style={styles.weglideActionText}>{importing ? 'importiert...' : 'neue flüge importieren'}</Text>
          </Pressable>
          <Pressable style={styles.weglideActionButton} onPress={handleShareToWeglide}>
            <ExternalLink size={16} color={colors.textPrimary} />
            <Text style={styles.weglideActionText}>flug auf weglide teilen</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Settings size={16} color={colors.textSecondary} />
        <Text style={styles.signOutText}>abmelden</Text>
      </Pressable>

      <ClubSearchModal
        visible={clubModalVisible}
        onClose={() => setClubModalVisible(false)}
        onSelect={handleClubSelect}
      />

      <WeglideUserSearchModal
        visible={weglideModalVisible}
        onClose={() => setWeglideModalVisible(false)}
        onSelect={handleWeglideLink}
      />
    </View>
  );
}

function WeglideUserSearchModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: WeglideUser) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeglideUser[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchWeglideUser(query).then(setResults).catch(() => setResults([]));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>weglide-profil finden</Text>
          <Text style={styles.modalHint}>
            nur olc-punkte/flugdaten werden gelesen — es kann nichts in deinem namen auf weglide gepostet werden
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="deinen namen auf weglide eingeben..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable style={styles.clubRow} onPress={() => onSelect(item)}>
                <Text style={styles.clubName}>{item.name}</Text>
                {item.club && <Text style={styles.clubCountry}>{item.club.name}</Text>}
              </Pressable>
            )}
          />
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>abbrechen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ClubSearchModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (club: WeglideClub) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeglideClub[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchClubs(query).then(setResults).catch(() => setResults([]));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>verein suchen</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="vereinsname eingeben..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable style={styles.clubRow} onPress={() => onSelect(item)}>
                <Text style={styles.clubName}>{item.name}</Text>
                <Text style={styles.clubCountry}>{item.country}</Text>
              </Pressable>
            )}
          />
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>abbrechen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDeep,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
  },
  avatarFallback: {
    backgroundColor: colors.thermalOrangeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.display,
    fontSize: 28,
    color: colors.textPrimary,
  },
  name: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  username: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  clubButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.skySurface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.skyBorder,
  },
  clubButtonText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.skySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    ...shadow.card,
  },
  statValue: {
    fontFamily: typography.mono,
    fontSize: 18,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.textTertiary,
  },
  weglideHint: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  weglideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.skySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.skyBorder,
  },
  weglideCardText: {
    flex: 1,
  },
  weglideCardTitle: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  weglideCardHint: {
    fontFamily: typography.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  weglideActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  weglideActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.skySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.skyBorder,
  },
  weglideActionText: {
    fontFamily: typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
  },
  modalHint: {
    fontFamily: typography.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  signOutButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  signOutText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.skySurface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    minHeight: '60%',
  },
  modalTitle: {
    fontFamily: typography.display,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.skyDeep,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.body,
    marginBottom: spacing.md,
  },
  clubRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.skyBorder,
  },
  clubName: {
    fontFamily: typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
  },
  clubCountry: {
    fontFamily: typography.body,
    color: colors.textTertiary,
    fontSize: 12,
  },
  modalClose: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: typography.bodyMedium,
    color: colors.textSecondary,
  },
});
