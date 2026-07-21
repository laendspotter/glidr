import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Mountain, Gauge, Clock, MapPin } from 'lucide-react-native';
import { colors, typography, spacing, radius, shadow } from '../../src/theme/tokens';
import { db } from '../../src/services/firebase';
import type { Flight } from '../../src/types/models';

export default function HistoryScreen() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'flights'),
      where('uid', '==', uid),
      orderBy('startTime', 'desc')
    );
    getDocs(q).then((snap) => {
      setFlights(snap.docs.map((d) => d.data() as Flight));
      setLoading(false);
    });
  }, [uid]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>deine flüge</Text>

      <FlatList
        data={flights}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>noch keine flüge getrackt</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <FlightRow flight={item} />}
      />
    </View>
  );
}

function FlightRow({ flight }: { flight: Flight }) {
  const date = new Date(flight.startTime);
  const durationMin = Math.round(flight.durationSec / 60);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>
          {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={[styles.statusBadge, statusStyles[flight.status]]}>
          <Text style={styles.statusText}>{statusLabels[flight.status]}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatBlock icon={<Gauge size={16} color={colors.thermalOrange} />} label="distanz" value={`${flight.distanceKm.toFixed(1)} km`} />
        <StatBlock icon={<Mountain size={16} color={colors.airspaceBlue} />} label="max höhe" value={`${Math.round(flight.maxAltitudeM)} m`} />
        <StatBlock icon={<Clock size={16} color={colors.textSecondary} />} label="dauer" value={`${durationMin} min`} />
      </View>

      {flight.startAirfield && (
        <View style={styles.airfieldRow}>
          <MapPin size={14} color={colors.textTertiary} />
          <Text style={styles.airfieldText}>
            {flight.startAirfield}
            {flight.landingAirfield && flight.landingAirfield !== flight.startAirfield ? ` → ${flight.landingAirfield}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

function StatBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const statusLabels: Record<Flight['status'], string> = {
  live: 'live',
  processing: 'wird verarbeitet',
  published: 'gepostet',
  discarded: 'verworfen',
};

const statusStyles = StyleSheet.create({
  live: { backgroundColor: colors.thermalOrange },
  processing: { backgroundColor: colors.airspaceBlue },
  published: { backgroundColor: colors.successClimb },
  discarded: { backgroundColor: colors.skyBorder },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDeep,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontFamily: typography.body,
    color: colors.textTertiary,
  },
  card: {
    backgroundColor: colors.skySurface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardDate: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: colors.skyDeep,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBlock: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: typography.mono,
    fontSize: 16,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.textTertiary,
  },
  airfieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.skyBorder,
  },
  airfieldText: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
});
