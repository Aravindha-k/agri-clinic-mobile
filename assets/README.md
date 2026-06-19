# Brand assets

## Logo (`kavya-logo.png`)

Used for:

- In-app `AppLogo` (`src/brand/constants.ts` → `LOGO_IMAGE`)
- Native app icon (`app.json` → `icon`)
- Android adaptive icon foreground (`android.adaptiveIcon.foregroundImage`)
- Expo splash screen (`splash.image` + `expo-splash-screen` plugin)

**Recommended:** square PNG, at least **1024×1024**, transparent or solid background.

## Production checklist

1. **Production API:** `http://13.207.17.117/api/v1/` (see `src/api/config.ts`).
2. **Verify API:** `npm run verify:api`
3. **EAS project:** `npx eas-cli login` → `npx eas init` (links project id in `app.json`).
4. **Client APK:** `npx eas-cli build -p android --profile preview` → download from Expo dashboard.
5. **Play Store:** `npm run build:aab` → `eas submit -p android`.
