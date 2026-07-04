# Kavya Agri Clinic — Client QA Checklist (v1.0.1)

Test on **Moto Edge 50 Pro**, **Moto Edge 60 Pro**, one low-end phone, and emulator API 29 + 35.

Network: Wi‑Fi, Jio mobile data, Airtel mobile data, airplane mode (offline).

## Install & auth
- [ ] Cold install APK
- [ ] Splash completes within 3 seconds (no hang)
- [ ] Login with production credentials
- [ ] Logout and login again
- [ ] Token refresh / reopen app while logged in

## Core tabs
- [ ] Today dashboard loads
- [ ] Work queue + visits list
- [ ] Day tab / workday start & stop
- [ ] Me / profile tab

## Farmer & visits (critical)
- [ ] Open farmer from Work queue — **no crash**
- [ ] Farmer details: photo, stats, crops, fields, visit history
- [ ] Pull-to-refresh on farmer details
- [ ] Create visit (FAB flow)
- [ ] Photo capture / gallery upload on visit
- [ ] Offline visit queue + sync after reconnect

## Location & maps
- [ ] GPS permission allow
- [ ] GPS permission deny (friendly message, no crash)
- [ ] My Location / live map
- [ ] Farmer map from profile

## Resilience
- [ ] Slow network — loading states, no crash
- [ ] No internet — offline banner, no crash
- [ ] Back button from nested screens
- [ ] Background app and reopen
- [ ] Force-stop and reopen

## Notifications
- [ ] POST_NOTIFICATIONS permission prompt (Android 13+)
- [ ] Notifications screen opens

## Error recovery
- [ ] If error screen appears: Retry works
- [ ] Go to Home works
- [ ] Logout works

Pass criteria: **zero crashes** on Edge 50 Pro and Edge 60 Pro for all critical flows above.
