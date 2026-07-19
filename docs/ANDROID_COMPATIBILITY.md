# Android compatibility & responsive design

## Supported Android range

| Item | Value |
|------|--------|
| Expo SDK | 54 |
| React Native | Expo 54 default (RN 0.81 line) |
| **minSdkVersion** | **26 (Android 8.0)** |
| compileSdk / targetSdk | Expo SDK 54 managed defaults (**API 35** typical) |
| Orientation | **Portrait locked** (Expo `orientation` + AndroidManifest) |
| Keyboard | `android.softwareKeyboardLayoutMode: "resize"` |

Portrait is locked because field workflows (visit forms, sticky footers, Day map + tab bar) are designed for vertical layout. Camera/media pickers still open in their system UIs.

## Layout helpers

- `src/utils/responsiveLayout.ts` — breakpoints, content max width (480), Day map floor (220+)
- `src/hooks/useResponsiveLayout.ts` — live `useWindowDimensions` metrics
- `src/hooks/useStackBottomInset.ts` — stack screens clear gesture / 3-button nav
- `src/utils/androidCapabilities.ts` — API / Expo Go capability flags
- `src/utils/androidChrome.ts` — nav-bar chrome; no-ops safely in Expo Go / edge-to-edge

## Fixes in this pass

1. **Day map** — non-zero fill height, compact summary on short phones, `minHeight` floor
2. **Visit shell** — live window width for step animations (no stale `Dimensions.get`)
3. **Stack screens** — Settings / Help / Offline / Sync / Problems use bottom safe inset
4. **Visit image viewer** — close control uses safe-area top
5. **Today header** — reduced minHeight for short phones; essentials wrap on narrow widths
6. **Tab bar constant** — `Layout.tabBarHeight` aligned to 58
7. **Keyboard** — Expo Android resize mode confirmed
8. **Expo Go** — navigation-bar color APIs skipped when unsupported

## Product constraints unchanged

- Today: welcome, status, visits/farmers/distance, quick actions, recent activity — no live timer, no End Workday
- Day: compact summary + full-page map — no polyline, no employee End Workday
- Branding / API environment selection unchanged

## Test matrix (manual / device)

### Android versions
| Version | Priority | Notes |
|---------|----------|--------|
| 8.0 (API 26) | Required floor | Emulator smoke |
| 10 | Recommended | |
| 12 | Recommended | Gesture nav |
| 13 | Required | Notification runtime permission |
| 14 / 15 (target) | Required | FGS / media permissions |

### Screen sizes
| Size | Class |
|------|--------|
| 320×568 | XS short |
| 360×640 | Small |
| 360×800 | Common |
| 412×915 | Large |
| 430×932 | Tall large |

### Navigation / display
- Gesture vs 3-button navigation
- Default / large / very large font scale
- Display zoom increased
- Light app theme under dark system mode

### Connectivity / permissions
- Wi-Fi, mobile data, slow, offline, reconnect+sync
- Location / camera / notifications: grant, deny, permanent deny
- Biometric unavailable
- GPS disabled

### Builds
- Expo Go (limited native — must not fail startup)
- Dev client
- Preview APK
- Production APK

## Automated checks performed

```bash
node scripts/test-android-responsive.mjs
node --test scripts/test-workday-ui.mjs
node scripts/test-accessibility-active-v2.mjs
node scripts/test-day-map-semantics.mjs
npx tsc --noEmit
```

## Still needs real-device verification

- Samsung / Redmi / Realme OEM gesture insets on Day map
- Gboard + Samsung Keyboard on visit steps 1–3
- Tamil wrapping at max font scale on Today cards and tab labels
- Google Maps absent / Play Services missing fallback
- Background location on API 29+ after workday start (dev build, not Expo Go)
- Notification permission prompt timing on API 33+
