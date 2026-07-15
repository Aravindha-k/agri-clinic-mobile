# Android launcher icon

**Source of truth:** `../logo_icons.png` — used **exactly as designed** (no redesign).

```bash
node scripts/promote-logo-icons.mjs
# or CI entry:
node scripts/generate-kac-app-icons.mjs
```

## How Android shows it

| Layer | Asset | Behavior |
|-------|--------|----------|
| Expo / legacy `icon` | `../app_icon.png` | Exact `logo_icons.png` (full white rounded-square) |
| Adaptive foreground | `../adaptive_icon_foreground.png` | Same artwork **inset ~70%** with transparent padding (Android safe zone) so OEM circle/squircle masks do **not** crop the plate |
| Adaptive background | `#FFFFFF` | Opaque white behind the inset plate |

## Rules

- Do **not** redesign, recolor, or crop the source mark.
- Adaptive background is opaque white (`#FFFFFF`, `@color/iconBackground`).
- Keep the launcher label `Kavya Agri` unchanged.

## Files

| File | Role |
|------|------|
| `../logo_icons.png` | Designer source (immutable) |
| `../logo_icon.png` | In-app copy of source |
| `../app_icon.png` | Expo / legacy square icon |
| `../adaptive_icon_foreground.png` | Adaptive foreground (safe-zone inset) |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | 1024 masters |
| `mask_preview_*.png` | Installed-look QA (white bg + mask) |
