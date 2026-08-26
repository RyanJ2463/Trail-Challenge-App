import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { listMyPendingInvites } from '../../../lib/challengeInvites';
import { colors } from '../../../lib/theme';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      listMyPendingInvites(userId)
        .then((invites) => setPendingInviteCount(invites.length))
        .catch(() => {});
    }, [userId])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: () => <TabIcon emoji="🏆" />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: () => <TabIcon emoji="👥" />,
          tabBarBadge: pendingInviteCount > 0 ? pendingInviteCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: () => <TabIcon emoji="👤" />,
        }}
      />
    </Tabs>
  );
}
