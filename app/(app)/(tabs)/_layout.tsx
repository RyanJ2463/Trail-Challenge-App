import { useCallback, useState } from 'react';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { listMyPendingInvites } from '../../../lib/challengeInvites';
import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../lib/theme';

function tabIcon(name: IconName) {
  return ({ color }: { color: ColorValue }) => (
    <Icon name={name} size={23} color={color as string} strokeWidth={1.9} />
  );
}

export default function TabsLayout() {
  const { session } = useAuth();
  const { colors, fonts } = useTheme();
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
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.semibold },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: tabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: tabIcon('leaderboard'),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: tabIcon('friends'),
          tabBarBadge: pendingInviteCount > 0 ? pendingInviteCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: tabIcon('profile'),
        }}
      />
    </Tabs>
  );
}
