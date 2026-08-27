import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/Icon';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    setError(null);

    if (!email.trim() || !password || !username.trim() || !displayName.trim()) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);
    // username/display_name land in raw_user_meta_data, which the
    // handle_new_user trigger reads to create the public.users row.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
          display_name: displayName.trim(),
        },
      },
    });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // With email confirmation enabled (the Supabase default), signUp
    // succeeds but returns no session until the user confirms — the
    // (app) group won't unlock until then.
    if (!data.session) {
      setConfirmationSent(true);
    }
  };

  if (confirmationSent) {
    return (
      <View style={styles.container}>
        <View style={styles.wordmark}>
          <Icon name="mail" size={42} color={colors.primary} strokeWidth={1.7} />
        </View>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.info}>
          We sent a confirmation link to {email}. Confirm your email, then sign in.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join a challenge and start racking up trail miles.</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textFaint}
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoComplete="off"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Display name"
        placeholderTextColor={colors.textFaint}
        autoComplete="off"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? 'Creating account…' : 'Sign up'}</Text>
      </TouchableOpacity>

      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  wordmark: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  info: {
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
