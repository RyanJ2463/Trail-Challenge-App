import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Home' }}>
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
