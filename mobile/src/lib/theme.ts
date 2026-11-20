// ManeMaid design tokens.
import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  ink: '#1B1F3B',
  inkSoft: '#3A3F63',
  muted: '#7A8098',
  line: '#ECEBF4',
  surface: '#FFFFFF',
  canvas: '#F6F5FB',
  primary: '#6759D1',
  primaryDark: '#4B3FB0',
  primarySoft: '#EEEBFF',
  green: '#22A06B',
  greenSoft: '#E4F7EE',
  orange: '#E07B39',
  orangeSoft: '#FFF0E4',
  blue: '#3D86D6',
  blueSoft: '#E7F1FF',
  danger: '#D64B57',
  dangerSoft: '#FFEDEF',
  gold: '#F5B83D',
} as const;

export type Tone = 'neutral' | 'primary' | 'green' | 'orange' | 'blue' | 'danger';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: colors.muted, bg: '#F1F0F6' },
  primary: { fg: colors.primary, bg: colors.primarySoft },
  green: { fg: colors.green, bg: colors.greenSoft },
  orange: { fg: colors.orange, bg: colors.orangeSoft },
  blue: { fg: colors.blue, bg: colors.blueSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
};

/** Light-to-dark gradient pairs used for the 3D-lit icon tiles and buttons. */
export const gradients: Record<Tone | 'hero' | 'gold', readonly [string, string, ...string[]]> = {
  hero: ['#8E7BFF', '#6759D1', '#4B3FB0'],
  primary: ['#8B7DF5', '#5A4BC6'],
  green: ['#4CD49A', '#1E9463'],
  orange: ['#FFAE6B', '#E0702A'],
  blue: ['#6FB2FF', '#2F74C8'],
  danger: ['#FF8A93', '#C93A47'],
  neutral: ['#B7B9CC', '#7A8098'],
  gold: ['#FFD978', '#EFA21F'],
};

// One family per weight (Android ignores fontWeight with custom fonts).
export const fonts = {
  display: 'Manrope_800ExtraBold',
  heading: 'Manrope_700Bold',
  subheading: 'Manrope_600SemiBold',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Soft, colored depth shadow that works on both platforms. */
export function shadow(level: 1 | 2 | 3 = 1, color: string = '#2A1F7A'): ViewStyle {
  const map = { 1: [4, 10, 0.08, 3], 2: [8, 18, 0.14, 8], 3: [14, 28, 0.22, 14] } as const;
  const [y, r, o, e] = map[level];
  return Platform.select<ViewStyle>({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowRadius: r, shadowOpacity: o },
    default: { elevation: e, shadowColor: color },
  });
}
