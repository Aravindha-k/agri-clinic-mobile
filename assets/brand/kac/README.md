# Android launcher icon

**Launcher source only:** `../logo_icons.png` (never used in app screens).

**In-app / splash company logo:** project-root `../../logo.png`.

```bash
node scripts/promote-logo-icons.mjs
node scripts/generate-kac-app-icons.mjs
```

## Adaptive layers

| Layer | Asset | Fact |
|-------|--------|------|
| Legacy / Expo `icon` | `../app_icon.png` | Exact `logo_icons.png` |
| Adaptive foreground | `../adaptive_icon_foreground.png` | Same art inset **70%** (diagonal ≤ canvas → fits Pixel circle) |
| Adaptive background | `#FFFFFF` | Adaptive background is opaque white |

## Rules

- Do **not** redesign launcher art.
- Adaptive background is opaque white (`#FFFFFF`).
- Launcher pipeline must not overwrite `logo.png`.
- Keep label `Kavya Agri`.
- Safe zone: adaptive inset 70%.
