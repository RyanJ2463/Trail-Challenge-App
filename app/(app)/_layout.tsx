import { Stack } from 'expo-router';
import { useTheme } from '../../lib/theme';

export default function AppLayout() {
  const { colors, fonts } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Home',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="challenge/new/index" options={{ title: 'Start a Challenge' }} />
      <Stack.Screen name="challenge/new/details" options={{ title: 'Challenge Details' }} />
      <Stack.Screen name="challenge/[id]" options={{ title: '' }} />
      <Stack.Screen name="profile/[id]" options={{ title: '' }} />
      <Stack.Screen name="profile/edit" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="account-settings" options={{ title: 'Account Settings' }} />
    </Stack>
  );
}
