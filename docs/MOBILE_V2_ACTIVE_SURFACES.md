# Mobile V2 — Active Surfaces & Legacy Classification

Phase 7E reference. Active V2 is **light-theme only**. Dark mode is not shipped.

Navigation model: React Navigation (`App.tsx` → `AppProviders` → `RootNavigator`). Files under `mobile/app/**` are imported as components (Expo Router is not the runtime router).

## Active V2 routes

| Surface | Source | Notes |
|---------|--------|--------|
| Login | `src/screens/AuthStartScreen.tsx` → `LoginScreen.tsx` | Auth stack |
| Startup recovery | `src/screens/StartupScreen.tsx` | Overlay during critical startup timeout |
| Today (Home) | `mobile/app/(tabs)/index.tsx` | Tab |
| Work | `mobile/app/(tabs)/work.tsx` | Tab |
| Day / Tracking | `mobile/app/tracking.tsx` | Tab |
| Me / Profile | `mobile/app/(tabs)/profile.tsx` | Tab |
| FAB New Visit | `src/components/ui/VisitFabTabButton.tsx` | Center tab button |
| Visit flow 1–4 | `mobile/app/visit/index.tsx` + `create-step*.tsx` | Modal stack |
| Visit success | `mobile/app/visit/success.tsx` | |
| Visit detail | `mobile/app/visit/[id].tsx` | |
| Farmer detail | `mobile/app/farmer/[id].tsx` | |
| Farmer map | `src/screens/map/FarmerMapScreen.tsx` | |
| My Location / Live / Travel | `src/screens/map/MyLocationScreen.tsx` | Aliased routes |
| Offline sync | `src/screens/OfflineSyncScreen.tsx` | |
| Sync status | `src/screens/SyncStatusScreen.tsx` | |
| Notifications | `mobile/app/notifications.tsx` | |
| Problems catalog | `mobile/app/problems.tsx` | |
| Diagnostics | `mobile/app/me/diagnostics.tsx` | |
| Settings | `src/screens/SettingsScreen.tsx` | |
| Help | `src/screens/HelpScreen.tsx` | |

## Active shared components (non-exhaustive)

- `mobile/components/duty/*` — sole workday UI (DutyContext is sole duty authority)
- `mobile/components/navigation/MainTabBar.tsx`
- `mobile/components/work/*`, `mobile/components/visits/PendingVisitDetail.tsx`
- `mobile/components/visit/*`, `mobile/components/farmers/*`, `mobile/components/today/*`
- `src/components/map/FieldMapView.tsx`, `FieldMapMarker.tsx`
- Splash: `src/components/brand/KavyaCinematicSplash.tsx` (preserve design)

## Legacy / dormant (`@legacy-mobile-screen`)

Not imported by `RootNavigator` / `VisitFlowNavigator`. Do not wire into active routes.

- `src/screens/FarmersListScreen.tsx`
- `src/screens/FarmerDetailScreen.tsx`
- `src/screens/VisitForm.tsx`
- `src/screens/VisitsListScreen.tsx`
- `src/screens/VisitDetailScreen.tsx` (superseded by `mobile/app/visit/[id].tsx`)
- `src/screens/TrackingHubScreen.tsx`
- `src/screens/TrackingScreen.tsx`
- `src/screens/NotificationsScreen.tsx` (superseded by `mobile/app/notifications.tsx`)
- `src/screens/ProfileScreen.tsx`
- `src/screens/MoreMenuScreen.tsx`
- `src/screens/BootstrapScreen.tsx`
- `src/screens/SplashScreen.tsx`
- `src/screens/map/LiveMapScreen.tsx`
- `src/screens/map/TravelHistoryScreen.tsx`
- `src/screens/shared.tsx`
- `mobile/app/visit/details.tsx` — unwired stub
- `mobile/components/workday/WorkdayHero.tsx` — unused; reduced-motion risk if reintroduced

## Safe deletion candidates

Legacy screens above are deletion candidates after a final import grep. Prefer archive/mark over delete unless unused is proven in CI.

## Theme scope

- Active V2 uses static light tokens in `mobile/lib/theme.ts`.
- `ThemeProvider` forces light appearance for production V2.
- Settings explains dark mode is a future update (no functional toggle).

## Pre-change audit (Phase 7E)

Priority findings before hardening:

1. Login + FieldMapView — mostly hard-coded English
2. Visit detail — mixed EN / small touch targets
3. Duty cards — “Remaining / Expected End / Started / GPS Off” hard-coded
4. FAB glow loop — no reduced-motion gate
5. Icon-only controls under 48dp (queue filters, call, close)
6. `text4` / muted contrast on tinted surfaces
7. WorkdayActionFooter absolute positioning + scroll padding coupling
8. No dark toggle UI but system dark could tint nav theme inconsistently

Full matrix lived in Phase 7E implementation notes; fixes target active rows only.
