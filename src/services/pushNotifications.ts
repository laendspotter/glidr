import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// bestimmt wie eingehende notifications behandelt werden, während die app offen ist
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// registriert das gerät für push und speichert den token am user-profil,
// damit ein backend später gezielt an diesen user pushen kann
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (!Device.isDevice) {
    // simulatoren/emulatoren können keine echten push-tokens bekommen
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FF7A3D',
    });
  }

  await updateDoc(doc(db, 'users', uid), { pushToken: token });
  return token;
}

// lokale test-notification, nützlich zum durchtesten ohne backend-trigger
export async function sendLocalTestNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // sofort
  });
}
