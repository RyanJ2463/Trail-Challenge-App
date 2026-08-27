// Shared design tokens. Keep the palette small and reused everywhere rather
// than letting each screen pick its own greens/greys — that's what makes the
// app read as one product instead of a stack of separate screens.

export const colors = {
  background: '#f6f7f2',
  surface: '#ffffff',
  border: '#e2e5dd',
  text: '#1c231d',
  textMuted: '#5c6b5e',
  textFaint: '#8b9a8c',
  primary: '#2f6f4f',
  primaryDark: '#234f39',
  primaryMuted: '#e5efe8',
  route: '#c7d6cb',
  danger: '#b3261e',
  white: '#ffffff',
  // A second marker hue for challenge maps — friends' positions, distinct from
  // your own green dot. Same lightness/chroma as `primary`, shifted in hue.
  friend: '#47688c',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 18, fontWeight: '700' as const },
  subheading: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
};
