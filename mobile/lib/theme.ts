/**
 * Agri Clinic mobile design tokens.
 * Flat design — no drop shadows. System font only.
 */

export const Colors = {
  // Brand
  brand700: '#1b4332',
  brand500: '#2d6a4f',
  brand300: '#52b788',
  brand100: '#d8f3dc',
  brand50: '#f0faf3',

  // Surfaces
  bg: '#f4f4f0',
  surface: '#ffffff',
  border: '#e5e7eb',
  /** Stronger dividers (legacy screens until rebuild) */
  border2: '#d1d5db',

  // Text
  text1: '#111111',
  text2: '#374151',
  text3: '#6b7280',
  text4: '#9ca3af',

  // Semantic
  amber: '#f59e0b',
  amberBg: '#fef3c7',
  amberText: '#92400e',
  red: '#ef4444',
  redBg: '#fef2f2',
  redText: '#991b1b',
  green: '#22c55e',
  greenBg: '#f0fdf4',
  greenText: '#166534',
  blue: '#3b82f6',
  blueBg: '#eff6ff',
  blueText: '#1e40af',
  purple: '#8b5cf6',
  purpleBg: '#f5f3ff',
  purpleText: '#7e22ce',
} as const;

export type ColorToken = keyof typeof Colors;

export const Radius = {
  /** Inner cards, chips */
  inner: 12,
  /** Primary cards */
  card: 16,
  /** Buttons, inputs */
  button: 14,
  /** Small chips */
  chip: 8,
  /** Pills, avatars (sm/md) */
  pill: 50,
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  avatarSm: 12,
  avatarLg: 16,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Horizontal screen padding */
  screen: 16,
  /** Card internal padding */
  card: 14,
  cardLg: 16,
} as const;

export const FontSize = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 15,
  xl: 17,
  h2: 18,
  h1: 20,
  hero: 22,
  stat: 28,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Flat design only — use borders instead of elevation. */
export const Shadow = {
  none: {},
} as const;

/** Layout constants from design system */
export const Layout = {
  touchTargetMin: 48,
  tabBarHeight: 60,
  cardBorderWidth: 0.5,
  fabSize: 56,
  fabRaise: 18,
} as const;

const AVATAR_PALETTE: Record<string, [string, string]> = {
  A: ['#dbeafe', '#1d4ed8'],
  B: ['#dcfce7', '#166534'],
  C: ['#fce7f3', '#be185d'],
  D: ['#fdf4ff', '#7e22ce'],
  E: ['#dbeafe', '#1d4ed8'],
  F: ['#fef3c7', '#92400e'],
  G: ['#dcfce7', '#166534'],
  H: ['#fce7f3', '#be185d'],
  I: ['#eff6ff', '#1e40af'],
  J: ['#f0fdf4', '#166534'],
  K: ['#fdf4ff', '#7e22ce'],
  L: ['#fef3c7', '#92400e'],
  M: ['#fce7f3', '#be185d'],
  N: ['#dbeafe', '#1d4ed8'],
  O: ['#fdf4ff', '#7e22ce'],
  P: ['#dcfce7', '#166534'],
  Q: ['#fef3c7', '#92400e'],
  R: ['#dbeafe', '#1d4ed8'],
  S: ['#dcfce7', '#166534'],
  T: ['#fdf4ff', '#7e22ce'],
  U: ['#fce7f3', '#be185d'],
  V: ['#eff6ff', '#1e40af'],
  W: ['#fef3c7', '#92400e'],
  X: ['#dbeafe', '#1d4ed8'],
  Y: ['#dcfce7', '#166534'],
  Z: ['#fdf4ff', '#7e22ce'],
};

const AVATAR_FALLBACK: [string, string] = ['#f3f4f6', '#374151'];

/** Deterministic avatar colors from the first letter of the name. */
export function getAvatarColors(name: string): [string, string] {
  const trimmed = name.trim();
  if (!trimmed) return AVATAR_FALLBACK;
  const letter = trimmed[0].toUpperCase();
  return AVATAR_PALETTE[letter] ?? AVATAR_FALLBACK;
}

/** First letter of first + last name, or first two characters. */
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
