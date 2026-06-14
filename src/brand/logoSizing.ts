/** Consistent logo dimensions — square containers, `contain` resize to avoid stretch. */
export const LOGO_SIZES = {
  loginPlate: 148,
  loginMark: 128,
  homeHeader: 52,
  profileHeader: 44,
  appLogo: { xs: 28, sm: 40, md: 52, lg: 72, xl: 96 } as const,
  splash: 128,
  notificationIcon: 40
} as const;
