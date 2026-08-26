import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Home' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="challenge/new/index" options={{ title: 'Start a Challenge' }} />
      <Stack.Screen name="challenge/new/details" options={{ title: 'Challenge Details' }} />
      <Stack.Screen name="challenge/[id]" options={{ title: '' }} />
      <Stack.Screen name="leaderboard" options={{ title: 'Weekly Leaderboard' }} />
      <Stack.Screen name="friends" options={{ title: 'Friends' }} />
    </Stack>
  );
}
