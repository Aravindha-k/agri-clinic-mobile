# Android launcher icon

**Source of truth:** `../logo_icons.png` — launcher/home-screen only (no redesign).

In-app branding uses `../company_logo.png` (copied from project-root `logo.png`). Never mix the two.

```bash
node scripts/promote-logo-icons.mjs
# or CI entry:
node scripts/generate-kac-app-icons.mjs
```

## How Android shows the launcher

| Layer | Asset | Behavior |
|-------|--------|----------|
| Expo / legacy `icon` | `../app_icon.png` | Exact `logo_icons.png` (full white rounded-square) |
| Adaptive foreground | `../adaptive_icon_foreground.png` | Same artwork **inset ~70%** with transparent padding |
| Adaptive background | `#FFFFFF` | Opaque white behind the inset plate |

## Rules

- Do **not** redesign, recolor, or crop the launcher source mark.
- Do **not** overwrite `company_logo.png` from the launcher pipeline.
- Adaptive background is opaque white (`#FFFFFF`, `@color/iconBackground`).
- Keep the launcher label `Kavya Agri` unchanged.

## Files

| File | Role |
|------|------|
| `../logo_icons.png` | Launcher designer source (immutable) |
| `../company_logo.png` | Official in-app company logo (from `logo.png`) |
| `../app_icon.png` | Expo / legacy square launcher icon |
| `../adaptive_icon_foreground.png` | Adaptive foreground (safe-zone inset) |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | 1024 masters |
| `mask_preview_*.png` | Installed-look QA (white bg + mask) |
