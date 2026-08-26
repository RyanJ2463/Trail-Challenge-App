import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ACTIVITY_TYPES } from '../../../../lib/activityTypes';
import { colors, radius, spacing, typography } from '../../../../lib/theme';

export default function ChooseActivityType() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>What kind of challenge?</Text>
      <Text style={styles.subheading}>
        Pick the activity this challenge tracks. You can fine-tune the details next.
      </Text>

      <View style={styles.grid}>
        {ACTIVITY_TYPES.map((activity) => (
          <TouchableOpacity
            key={activity.value}
            style={styles.option}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/challenge/new/details',
                params: { activityType: activity.value },
              })
            }
          >
            <Text style={styles.optionEmoji}>{activity.emoji}</Text>
            <Text style={styles.optionLabel}>{activity.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  heading: {
    ...typography.heading,
    fontSize: 22,
    color: colors.text,
    marginTop: spacing.md,
  },
  subheading: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  option: {
    width: '47%',
    aspectRatio: 1.1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  optionLabel: {
    ...typography.subheading,
    color: colors.text,
  },
});
