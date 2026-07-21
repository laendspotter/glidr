import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useEffect, useState, useRef } from 'react';
import { Plane } from 'lucide-react-native';
import { colors, typography, spacing, radius, shadow } from '../../src/theme/tokens';
import { subscribeToLiveTracks } from '../../src/services/social';
import type { LiveTrackPosition } from '../../src/types/models';

export default function LiveMapScreen() {
  const [positions, setPositions] = useState<LiveTrackPosition[]>([]);
  const [selected, setSelected] = useState<LiveTrackPosition | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const unsub = subscribeToLiveTracks(setPositions);
    return unsub;
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          // deutschland-zentriert als default, sinnvoll für die meisten user
          latitude: 48.5,
          longitude: 9.2,
          latitudeDelta: 4,
          longitudeDelta: 4,
        }}
        customMapStyle={darkMapStyle}
      >
        {positions.map((pos) => (
          <Marker
            key={pos.uid}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }}
            onPress={() => setSelected(pos)}
            rotation={pos.headingDeg}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.markerDot}>
              <Plane size={14} color={colors.skyDeep} fill={colors.skyDeep} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.liveBadge}>
        <View style={styles.pulseDot} />
        <Text style={styles.liveBadgeText}>{positions.length} in der luft</Text>
      </View>

      {selected && (
        <View style={styles.infoCard}>
          <Text style={styles.infoName}>{selected.displayName}</Text>
          <Text style={styles.infoReg}>{selected.gliderRegistration}</Text>
          <View style={styles.infoStats}>
            <Text style={styles.infoStat}>{Math.round(selected.altM)} m</Text>
            {selected.climbRateMs !== null && (
              <Text
                style={[
                  styles.infoStat,
                  { color: selected.climbRateMs >= 0 ? colors.successClimb : colors.dangerSink },
                ]}
              >
                {selected.climbRateMs >= 0 ? '+' : ''}
                {selected.climbRateMs.toFixed(1)} m/s
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// dunkles kartendesign passend zum sky-theme
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0B1120' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8B96A8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1120' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#141C2E' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232D42' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDeep,
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.thermalOrange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.skyDeep,
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.skySurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.liveIndicator,
  },
  liveBadgeText: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  infoCard: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.skySurface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  infoName: {
    fontFamily: typography.bodySemibold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  infoReg: {
    fontFamily: typography.mono,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  infoStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  infoStat: {
    fontFamily: typography.mono,
    color: colors.textPrimary,
    fontSize: 15,
  },
});
