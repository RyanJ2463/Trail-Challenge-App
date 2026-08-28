import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { deleteOwnAccount, updateEmail, updatePassword } from '../../lib/account';
import {
  fonts,
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  useThemePreference,
  type Theme,
  type ThemePreference,
} from '../../lib/theme';

const APPEARANCE_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function AccountSettings() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { preference, setPreference } = useThemePreference();

  const [email, setEmail] = useState(session?.user.email ?? '');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveEmail = async () => {
    setEmailStatus(null);
    setEmailSaving(true);
    try {
      await updateEmail(email.trim());
      setEmailStatus('Check your inbox to confirm the new email address.');
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : 'Could not update your email.');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordStatus(null);
    if (password.length < 6) {
      setPasswordStatus('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordStatus('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setPasswordStatus('Password updated.');
    } catch (err) {
      setPasswordStatus(err instanceof Error ? err.message : 'Could not update your password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, challenges you created, and all your activity data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteError(null);
            setDeleting(true);
            try {
              await deleteOwnAccount();
              await supabase.auth.signOut();
            } catch (err) {
              setDeleteError(err instanceof Error ? err.message : 'Could not delete your account.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => supabase.auth.signOut()}
        activeOpacity={0.85}
      >
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.segmented}>
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = preference === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => setPreference(option.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor={colors.textFaint}
      />
      <TouchableOpacity
        style={[styles.button, emailSaving && styles.buttonDisabled]}
        onPress={handleSaveEmail}
        disabled={emailSaving}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>{emailSaving ? 'Saving…' : 'Update email'}</Text>
      </TouchableOpacity>
      {emailStatus && <Text style={styles.status}>{emailStatus}</Text>}

      <Text style={styles.sectionTitle}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="New password"
        placeholderTextColor={colors.textFaint}
      />
      <TextInput
        style={[styles.input, styles.inputSpaced]}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Confirm new password"
        placeholderTextColor={colors.textFaint}
      />
      <TouchableOpacity
        style={[styles.button, passwordSaving && styles.buttonDisabled]}
        onPress={handleSavePassword}
        disabled={passwordSaving}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>{passwordSaving ? 'Saving…' : 'Update password'}</Text>
      </TouchableOpacity>
      {passwordStatus && <Text style={styles.status}>{passwordStatus}</Text>}

      <Text style={styles.sectionTitle}>Danger zone</Text>
      <View style={styles.dangerCard}>
        <Text style={styles.dangerText}>
          Deleting your account removes your profile, challenges you created, and all your
          activity data. This cannot be undone.
        </Text>
        {deleteError && <Text style={styles.status}>{deleteError}</Text>}
        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.buttonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : 'Delete account'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  signOutButtonText: {
    color: colors.text,
    fontFamily: fonts.semibold,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 17,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  segmentTextSelected: {
    color: colors.onPrimary,
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
  inputSpaced: {
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },
  status: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  dangerText: {
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },
});
