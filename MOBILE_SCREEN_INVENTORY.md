# Mobile Screen Inventory — Kavya Agri Clinic Field App

**Date:** 11 July 2026  
**Repo:** `d:\agri-clinic-mobile`  
**Navigation:** React Navigation (not Expo Router). `mobile/app/**` is a component folder convention.

---

## Architecture

```
App.tsx
  └─ KavyaCinematicSplash (≤3s)
  └─ AppProviders
       ├─ GlobalStatusStrip
       └─ RootNavigator
            ├─ Auth → Login
            └─ RootStack
                 ├─ Main (Bottom Tabs)
                 ├─ VisitFlow (modal)
                 ├─ MyLocation / LiveMap / TravelHistory
                 ├─ FarmerMap
                 ├─ OfflineSync
                 └─ Notifications
```

---

## Bottom tabs

| Route | Label (EN) | File | Status |
|-------|------------|------|--------|
| Today | Today | `mobile/app/(tabs)/index.tsx` | Wired |
| Work | Work | `mobile/app/(tabs)/work.tsx` | Wired |
| StartVisit | Visit (FAB) | `VisitFabTabButton` + VisitFlow | Wired |
| Day | Day | `mobile/app/tracking.tsx` | Wired |
| Me | Me | `mobile/app/(tabs)/profile.tsx` | Wired |

Tab bar: `mobile/components/navigation/MainTabBar.tsx`

---

## Complete screen list

### Bootstrap / splash

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Native splash hold | `src/bootstrap/nativeSplash.ts` | Launch | Wired |
| Cinematic splash | `src/components/brand/KavyaCinematicSplash.tsx` | Launch / sign-out | Wired |
| Auth hydrate blank | `RootNavigator` `!isReady` | Launch | Wired (blank View) |
| App boot error | `App.tsx` | Provider failure | Wired (minimal) |

### Authentication

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Login | `src/screens/LoginScreen.tsx` via `AuthStartScreen.tsx` | Unauthenticated | Wired |
| Biometric section | `src/components/auth/LoginBiometricSection.tsx` | Login | Wired |
| API diagnostics panel | `mobile/components/diagnostics/ProductionApiDiagnosticsPanel.tsx` | Login (collapsible) | Wired / hidden |

### Home / dashboard

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Today dashboard | `mobile/app/(tabs)/index.tsx` | Default tab | Wired |

Embedded: `TabDashboardSkeleton`, `OfflineBanner`, `WorkdayInactiveBanner`, `WorkdayHero`, `TodayQuickActions`, `RecentActivitySection`

### Farmer management

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Work → Queue (farmer list) | `WorkQueuePanel` in Work tab | Work segment | Wired |
| Farmer detail | `mobile/app/farmer/[id].tsx` | Queue / visits / notifications | Wired |
| Farmer map | `src/screens/map/FarmerMapScreen.tsx` | Farmer detail / root | Wired |
| New farmer (inline) | Visit step 1 | Visit flow | Wired (not standalone) |
| Edit farmer fields | — | — | **Missing** (photo only) |
| Legacy FarmersList | `src/screens/FarmersListScreen.tsx` | — | Unwired |
| Legacy FarmerDetail | `src/screens/FarmerDetailScreen.tsx` | — | Unwired |

### Visit workflow

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Visit shell | `mobile/app/visit/index.tsx` | FAB / revisit | Wired |
| Step 1 Farmer | `mobile/app/visit/create-step1.tsx` | Step store | Wired |
| Step 2 Crop/problem | `mobile/app/visit/create-step2.tsx` | Step store | Wired |
| Step 3 Notes/photos | `mobile/app/visit/create-step3.tsx` | Step store | Wired |
| Step 4 Review | `mobile/app/visit/create-step4-review.tsx` | Step store | Wired |
| Visit success | `mobile/app/visit/success.tsx` | After submit | Wired |
| Visit detail | `mobile/app/visit/[id].tsx` | Work visits / notifications | Wired |
| Work → Visits list | `WorkVisitsPanel` | Work segment | Wired |
| Step 2 stub | `mobile/app/visit/details.tsx` | — | Unwired placeholder |
| Legacy VisitForm | `src/screens/VisitForm.tsx` | — | Unwired |
| Legacy VisitsList | `src/screens/VisitsListScreen.tsx` | — | Unwired |
| Legacy VisitDetail | `src/screens/VisitDetailScreen.tsx` | — | Unwired |

### GPS / travel

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Day summary | `mobile/app/tracking.tsx` | Day tab | Wired |
| My Location | `src/screens/map/MyLocationScreen.tsx` | Today / Day | Wired |
| Live Map | same component | Root alias | Wired (alias) |
| Travel History | same component | Root alias | Wired (alias, no distinct UI) |
| Legacy TrackingHub | `src/screens/TrackingHubScreen.tsx` | — | Unwired |
| Legacy TrackingScreen | `src/screens/TrackingScreen.tsx` | — | Unwired |

### Notifications

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Notifications inbox | `mobile/app/notifications.tsx` | Today header / Profile | Wired |
| Legacy Notifications | `src/screens/NotificationsScreen.tsx` | — | Unwired |

### Profile / settings / diagnostics

| Screen | Path | Reach | Status |
|--------|------|-------|--------|
| Profile (Me) | `mobile/app/(tabs)/profile.tsx` | Me tab | Wired |
| Settings | `src/screens/SettingsScreen.tsx` | Profile menu | Wired |
| Help | `src/screens/HelpScreen.tsx` | Profile menu | Wired |
| Diagnostics | `mobile/app/me/diagnostics.tsx` | Profile menu | Wired |
| Problems catalog | `mobile/app/problems.tsx` | Today / Me | Wired |
| Offline Sync | `src/screens/OfflineSyncScreen.tsx` | Diagnostics / banners | Wired |
| Legacy Profile | `src/screens/ProfileScreen.tsx` | — | Unwired |
| Legacy MoreMenu | `src/screens/MoreMenuScreen.tsx` | — | Unwired |

### Modals / sheets / permission dialogs

| UI | Path | Status |
|----|------|--------|
| Workday Required Sheet | `mobile/components/workday/WorkdayRequiredSheet.tsx` | Wired |
| Master Select Sheet | `mobile/components/visit/MasterSelectSheet.tsx` | Wired |
| Village Filter Sheet | `mobile/components/farmers/VillageFilterSheet.tsx` | Wired |
| My Location bottom sheet | `src/components/myLocation/MyLocationBottomSheet.tsx` | Wired |
| Visit photo viewer Modal | `mobile/app/visit/[id].tsx` | Wired |
| Location required Alert | `src/utils/locationRequiredModal.ts` | Wired |
| Camera / gallery permission | `mobile/lib/visitPhotos.ts` | Wired |
| Notification permission | `src/notifications/fieldReminderNotifications.ts` | Wired |
| Sign-out Alert | Profile | Wired |
| End workday confirm | i18n exists | **UI not clearly wired** |

### Global banners / toasts / errors

| UI | Path | Status |
|----|------|--------|
| GlobalStatusStrip | `mobile/components/layout/GlobalStatusStrip.tsx` | Wired |
| OfflineBanner | `mobile/components/ui/OfflineBanner.tsx` | Wired |
| LanOfflineToast | `mobile/components/ui/LanOfflineToast.tsx` | Dev |
| ToastHost | `src/components/ui/ToastHost.tsx` | Wired |
| AppFallbackScreen | `src/components/AppFallbackScreen.tsx` | Wired |
| Screen / Nav / Map error boundaries | `src/components/*ErrorBoundary*` | Wired |
| TabDashboardSkeleton / ListSkeleton | mobile UI | Wired |
| EmptyState (V2) | `mobile/components/ui/EmptyState.tsx` | Wired |

### Developer / hidden

| Item | Access |
|------|--------|
| Production API diagnostics | Login + Diagnostics |
| Expo Go warning banner | Day tab (dev) |
| Technical details collapsible | Login / Diagnostics |
| Web mobile frame | Web only |

### i18n

| Language | File |
|----------|------|
| English (`en`) | `src/i18n/en.ts` |
| Tamil (`ta`) | `src/i18n/ta.ts` |

Switchable in Settings.

---

## Counts

| Category | Wired | Unwired / legacy |
|----------|-------|------------------|
| Primary tab screens | 5 (incl. FAB) | — |
| Named stack screens | ~15 | ~15 legacy files |
| Visit steps + success | 5 | 1 stub |
| Active modals/sheets | 6+ | 3 legacy-only |

*End of inventory.*
