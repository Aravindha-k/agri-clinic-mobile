# Stitch UI baseline — screenshot review checklist

Reload Expo Go after Metro restart, then capture these screens (same Wi‑Fi + local API or cloud per `.env.local`):

1. **Login** — mint background, white card, “Field Employee Login”, Sign In
2. **Home** — brand bar, Daily Operations, Today at a Glance, Recent Activity
3. **Farmer Directory** — list cards with LAST VISIT row, View / + visit
4. **Farmer Detail** — Farm Information tiles, Call farmer / Start visit
5. **Visit Detail** — observations, evidence, timeline sections
6. **Live Tracking** — status overlay + map
7. **Profile** — photo, Employee ID, device tiles, logout

Optional (same design tokens): Notifications, Route History, New Visit form — not in this pass.

```powershell
# With device connected via USB + adb:
.\scripts\capture-screenshots.ps1
```

Save outputs under `docs/screenshots/` for sign-off before APK build.
