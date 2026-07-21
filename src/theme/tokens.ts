// Design-System: "Thermal" — dunkles Himmel-Thema, thermik-orange als Signatur-Akzent
// Grund: kein Bahn-Terminal-Look (Modus A) hier, das Thema ist Luft/Himmel/Thermik,
// nicht Schiene. Warmer Orange-Akzent steht für aufsteigende Luft, kühles Nachtblau
// für den Himmel als Bühne.

export const colors = {
  // basis
  skyDeep: '#0B1120',      // fast-schwarzes nachtblau, haupt-hintergrund
  skySurface: '#141C2E',   // cards, erhöhte flächen
  skyBorder: '#232D42',    // trennlinien, subtile borders

  // text
  textPrimary: '#F1F5F9',
  textSecondary: '#8B96A8',
  textTertiary: '#5B6478',

  // signatur-akzent: thermik-orange (steigende luft)
  thermalOrange: '#FF7A3D',
  thermalOrangeMuted: '#8A4A2A',

  // sekundär: luftraum-blau (für links, aktive states abseits vom hauptakzent)
  airspaceBlue: '#4A9EFF',

  // status
  successClimb: '#3ECF8E',  // positive climb rate
  dangerSink: '#EF4444',    // negative climb rate / warnungen
  liveIndicator: '#FF7A3D', // pulsierender punkt auf der live-map

  overlay: 'rgba(11, 17, 32, 0.85)',
} as const;

export const typography = {
  display: 'Sora_700Bold',      // headlines - geometrisch, luftig, nicht terminal-mono
  displaySemibold: 'Sora_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  mono: 'IBMPlexMono_500Medium', // NUR für zahlen: distanz, höhe, m/s, geschwindigkeit
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
