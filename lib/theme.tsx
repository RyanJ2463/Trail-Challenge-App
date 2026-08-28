// Shared design system — "minimalist outdoor tech" (see design/style-guide/).
// One slate accent, a cool blue-grey neutral ramp, 1px borders instead of
// shadows, IBM Plex Sans for language and IBM Plex Mono for every number.
//
// Colours are resolved at render time so the app can follow light / dark.
// Screens build their StyleSheet through `useThemedStyles(makeStyles)`, where
// `makeStyles` is a module-level `({ colors, spacing, radius, typography,
// fonts }: Theme) => StyleSheet.create({ ... })`. Anything that needs a raw
// colour in JSX (icon tint, ActivityIndicator, Switch) pulls it from
// `useTheme()`.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

export type Palette = {
  /** App background — a cool near-white / near-black. */
  background: string;
  /** Cards, sheets, inputs — the flat layer the greys sit on. */
  surface: string;
  /** Hover / pressed rows, secondary panels, zebra. */
  raised: string;
  /** Every hairline: card edges, dividers, input outlines. */
  border: string;
  /** Disabled surfaces, chart gridlines. */
  borderStrong: string;
  /** Headings and body copy. Cool blue-black, never pure #000. */
  text: string;
  /** Body sub-text, captions, descriptions. AA at every size. */
  textMuted: string;
  /** Timestamps, "+X mi this week", the least-important text. AA floor. */
  textFaint: string;
  /** Muted icons / placeholder glyphs only — not a text colour. */
  disabled: string;
  /** The one accent: primary action, active state, your route, links. */
  primary: string;
  /** Pressed states, and accent text on the muted tint. */
  primaryDark: string;
  /** The accent at ~8% — selected rows, quiet chips, progress track. */
  primaryMuted: string;
  /** Text / icon colour that sits on a filled `primary` button. */
  onPrimary: string;
  /** The still-to-go part of a route on the map. */
  route: string;
  danger: string;
  dangerMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningText: string;
  warningMuted: string;
  info: string;
  infoMuted: string;
  /** Literal white — marker borders on the (always-light) map, etc. */
  white: string;
  /** A friend's marker / dot — the cycling indigo. */
  friend: string;
  hiking: string;
  walking: string;
  running: string;
  cycling: string;
  steps: string;
};

const light: Palette = {
  background: '#f5f6f8',
  surface: '#ffffff',
  raised: '#eef0f3',
  border: '#e4e7ec',
  borderStrong: '#d3d7de',
  text: '#1a1d24',
  textMuted: '#565e6c',
  textFaint: '#5f6673',
  disabled: '#8a909c',
  primary: '#31527c',
  primaryDark: '#25405f',
  primaryMuted: '#e9eef5',
  onPrimary: '#ffffff',
  route: '#d3d7de',
  danger: '#c23b2e',
  dangerMuted: '#fbe8e6',
  success: '#217a56',
  successMuted: '#e4f2ec',
  warning: '#b0791f',
  warningText: '#8a5e12',
  warningMuted: '#f7ecd3',
  info: '#2f6fb0',
  infoMuted: '#e9eef5',
  white: '#ffffff',
  friend: '#5b6b9e',
  hiking: '#365a86',
  walking: '#2f7d7a',
  running: '#9a6742',
  cycling: '#5b6b9e',
  steps: '#63707f',
};

// Dark is a first-class mode — an instrument panel is often dark. Neutrals
// stay cool blue-black, the accent gains lightness at the same low chroma,
// and filled buttons use dark text rather than white.
const dark: Palette = {
  background: '#111319',
  surface: '#191c24',
  raised: '#21252f',
  border: '#282c36',
  borderStrong: '#3a3f4c',
  text: '#eef0f4',
  textMuted: '#a3a9b6',
  textFaint: '#8a909c',
  disabled: '#6b7280',
  primary: '#6f97c8',
  primaryDark: '#a9c4e2',
  primaryMuted: '#1c2432',
  onPrimary: '#111319',
  route: '#3a3f4c',
  danger: '#ee8478',
  dangerMuted: '#2e1a18',
  success: '#5fc48f',
  successMuted: '#152a20',
  warning: '#f0be5c',
  warningText: '#f0be5c',
  warningMuted: '#2b2412',
  info: '#68acec',
  infoMuted: '#1c2432',
  white: '#ffffff',
  friend: '#8f9fd0',
  hiking: '#6f97c8',
  walking: '#5fb0ac',
  running: '#c79a72',
  cycling: '#8f9fd0',
  steps: '#9aa4b2',
};

/** Fixed light palette for map overlays — the Mapbox base map is always light. */
export const mapPalette = {
  scrim: 'rgba(255, 255, 255, 0.95)',
  border: light.border,
  ink: light.text,
  faint: light.textFaint,
  white: '#ffffff',
  route: light.route,
  primary: light.primary,
  friend: light.friend,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Application board: radii 8 / 10 / 12, pill for fully-round.
export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
};

// Font family keys are the same ones registered with `useFonts` in the root
// layout, so they resolve identically on iOS and Android. React Native does
// not synthesise weight for a custom family — pick the family that carries
// the weight rather than setting `fontWeight`.
export const fonts = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

export const typography = {
  title: { fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17 },
  subheading: { fontFamily: fonts.medium, fontSize: 15 },
  body: { fontFamily: fonts.regular, fontSize: 16 },
  caption: { fontFamily: fonts.regular, fontSize: 13 },
  // Mono overline — section labels, the "field survey" caps.
  overline: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  // Hero number — distance, pace, elevation.
  stat: { fontFamily: fonts.monoMedium, fontSize: 24 },
} satisfies Record<string, TextStyle>;

export type Theme = {
  colors: Palette;
  scheme: ColorScheme;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  fonts: typeof fonts;
};

/**
 * Light palette as a plain object, for the rare module-scope default that
 * can't call a hook. Prefer `useTheme()` inside components.
 */
export const colors = light;

const PREF_KEY = 'themePreference';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(PREF_KEY, next).catch(() => {});
  };

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: {
        colors: scheme === 'dark' ? dark : light,
        scheme,
        spacing,
        radius,
        typography,
        fonts,
      },
      preference,
      setPreference,
    }),
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx.theme;
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within a ThemeProvider');
  return { preference: ctx.preference, setPreference: ctx.setPreference, scheme: ctx.theme.scheme };
}

/**
 * Build a themed StyleSheet. `factory` must be a stable module-level function
 * so the memo only recomputes when the theme actually changes.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
