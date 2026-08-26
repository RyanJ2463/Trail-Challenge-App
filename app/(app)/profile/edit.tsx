import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { getProfile, updateProfileSettings, type ProfileVisibility } from '../../../lib/profile';
import { colors, radius, spacing, typography } from '../../../lib/theme';

const VISIBILITY_OPTIONS: { key: ProfileVisibility; label: string; hint: string }[] = [
  { key: 'private', label: 'Private', hint: 'Only you can see your profile.' },
  { key: 'friends', label: 'Friends', hint: 'Only accepted friends can see your profile.' },
  { key: 'public', label: 'Public', hint: 'Any signed-in user can see your profile.' },
];

export default function EditProfile() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [visibility, setVisibility] = useState<ProfileVisibility>('friends');
  const [showLifetimeMiles, setShowLifetimeMiles] = useState(true);
  const [showLifetimeSteps, setShowLifetimeSteps] = useState(true);
  const [showMonthlyStats, setShowMonthlyStats] = useState(true);
  const [showRecords, setShowRecords] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId)
      .then((profile) => {
        if (!profile) return;
        setAvatarUrl(profile.avatarUrl ?? '');
        setVisibility(profile.visibility);
        setShowLifetimeMiles(profile.showLifetimeMiles);
        setShowLifetimeSteps(profile.showLifetimeSteps);
        setShowMonthlyStats(profile.showMonthlyStats);
        setShowRecords(profile.showRecords);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setError(null);
    setSaving(true);
    try {
      await updateProfileSettings(userId, {
        avatarUrl: avatarUrl.trim() || null,
        visibility,
        showLifetimeMiles,
        showLifetimeSteps,
        showMonthlyStats,
        showRecords,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Avatar URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://…"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={avatarUrl}
        onChangeText={setAvatarUrl}
      />

      <Text style={styles.label}>Who can see your profile</Text>
      <View style={styles.visibilityList}>
        {VISIBILITY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.visibilityOption, visibility === option.key && styles.visibilityOptionSelected]}
            onPress={() => setVisibility(option.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.visibilityLabel,
                visibility === option.key && styles.visibilityTextSelected,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[styles.visibilityHint, visibility === option.key && styles.visibilityTextSelected]}
            >
              {option.hint}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>What others can see</Text>
      <Text style={styles.sectionHint}>
        These only affect what friends/public see — you always see all of your own stats.
      </Text>

      <SettingRow label="Lifetime miles" value={showLifetimeMiles} onChange={setShowLifetimeMiles} />
      <SettingRow label="Lifetime steps" value={showLifetimeSteps} onChange={setShowLifetimeSteps} />
      <SettingRow label="Monthly stats" value={showMonthlyStats} onChange={setShowMonthlyStats} />
      <SettingRow label="Records (best day/week/month)" value={showRecords} onChange={setShowRecords} />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
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
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  visibilityList: {
    gap: spacing.sm,
  },
  visibilityOption: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  visibilityOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  visibilityLabel: {
    ...typography.subheading,
    color: colors.text,
  },
  visibilityHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  visibilityTextSelected: {
    color: colors.white,
  },
  settingRow: {
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
  settingLabel: {
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
