/**
 * Screen-capture policy for Android FLAG_SECURE (via expo-screen-capture).
 *
 * Production/release builds block screenshots and screen recording by default.
 * Training/dev builds may allow capture without removing the production path.
 *
 * Switch:
 * - Local Metro (__DEV__): capture allowed automatically.
 * - Training/release APK: set EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE=1 at build time.
 * - Production APK: leave EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE unset (or not 1/true).
 *
 * Do NOT gate this on the QA logging flag — CI production APKs already enable QA logs.
 */
export function isScreenCaptureAllowEnv(raw: string | undefined | null): boolean {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function shouldPreventScreenCapture(input: {
  platform: string;
  isExpoGo: boolean;
  isDev: boolean;
  allowScreenCaptureEnv?: string | null;
}): boolean {
  if (input.platform !== "android") return false;
  if (input.isExpoGo) return false;
  if (input.isDev) return false;
  if (isScreenCaptureAllowEnv(input.allowScreenCaptureEnv)) return false;
  return true;
}
