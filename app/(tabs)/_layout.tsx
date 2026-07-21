import { Tabs } from 'expo-router';
import { Home, Radar, PlusCircle, History, User } from 'lucide-react-native';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.skySurface,
          borderTopColor: colors.skyBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.thermalOrange,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'feed',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'live',
          tabBarIcon: ({ color, size }) => <Radar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'hochladen',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'historik',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'profil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
