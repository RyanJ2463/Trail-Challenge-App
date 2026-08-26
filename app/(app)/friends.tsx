import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import {
  acceptFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
  type FriendRequest,
  type UserProfile,
} from '../../lib/friends';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function Friends() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [friendList, incomingList, outgoingList] = await Promise.all([
      listFriends(userId),
      listIncomingRequests(userId),
      listOutgoingRequests(userId),
    ]);
    setFriends(friendList);
    setIncoming(incomingList);
    setOutgoing(outgoingList);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      load()
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load friends.'))
        .finally(() => setLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const outgoingIds = useMemo(() => new Set(outgoing.map((r) => r.user.id)), [outgoing]);
  const incomingIds = useMemo(() => new Set(incoming.map((r) => r.user.id)), [incoming]);

  const handleSearch = async () => {
    if (!userId || !query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchUsers(query, userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Add friends</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or name"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.85}>
          <Text style={styles.searchButtonText}>{searching ? '…' : 'Search'}</Text>
        </TouchableOpacity>
      </View>
      {results.map((user) => {
        const state = friendIds.has(user.id) ? 'friend' : outgoingIds.has(user.id) ? 'pending' : 'none';
        return (
          <View key={user.id} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {user.display_name}
            </Text>
            {state === 'friend' ? (
              <Text style={styles.stateText}>Friends</Text>
            ) : state === 'pending' ? (
              <Text style={styles.stateText}>Requested</Text>
            ) : (
              <TouchableOpacity
                style={styles.smallButton}
                disabled={busyId === user.id}
                onPress={() => runAction(user.id, () => sendFriendRequest(userId!, user.id))}
                activeOpacity={0.85}
              >
                <Text style={styles.smallButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {incoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Requests</Text>
          {incoming.map((request) => (
            <View key={request.user.id} style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>
                {request.user.display_name}
              </Text>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.smallButton}
                  disabled={busyId === request.user.id}
                  onPress={() =>
                    runAction(request.user.id, () => acceptFriendRequest(request.user.id, userId!))
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.smallButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallButtonOutline}
                  disabled={busyId === request.user.id}
                  onPress={() =>
                    runAction(request.user.id, () => removeFriendship(userId!, request.user.id))
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.smallButtonOutlineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Friends · {friends.length}</Text>
      {friends.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No friends yet — search above to send a request.
          </Text>
        </View>
      ) : (
        friends.map((friend) => (
          <View key={friend.id} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {friend.display_name}
            </Text>
            <TouchableOpacity
              disabled={busyId === friend.id}
              onPress={() => runAction(friend.id, () => removeFriendship(userId!, friend.id))}
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {outgoing.filter((r) => !incomingIds.has(r.user.id)).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending</Text>
          {outgoing.map((request) => (
            <View key={request.user.id} style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>
                {request.user.display_name}
              </Text>
              <TouchableOpacity
                disabled={busyId === request.user.id}
                onPress={() => runAction(request.user.id, () => removeFriendship(userId!, request.user.id))}
              >
                <Text style={styles.removeText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 17,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  name: {
    ...typography.subheading,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  smallButtonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallButtonOutlineText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
