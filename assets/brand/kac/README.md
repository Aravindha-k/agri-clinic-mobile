# FINAL approved Android launcher icon

**Source of truth:** `../logo_splash.png` on the approved `app_icon_1024_approved.png` emerald background.

This is the production Kavya Agri Clinic launcher artwork: approved company seal on emerald `#0B3D2E`.

## Rules

- Do **not** redesign, AI-recreate, recolor, or retouch the company logo.
- `npm run icons:generate` only recomposes the approved company seal larger on the approved emerald background, then resizes it into Expo + Android mipmaps.
- Adaptive background color remains `#0B3D2E` (`@color/iconBackground`).

## Files

| File | Role |
|------|------|
| `../logo_splash.png` | Approved transparent company seal |
| `app_icon_1024_approved.png` | Approved 1024x1024 emerald icon background/reference |
| `app_icon_1024_approved_source.jpg` | Original upload as provided |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | Published 1024x1024 launcher masters |
| `adaptive_icon_background*.png` | Solid emerald adaptive background layer |
| `mask_preview_*.png` | QA only (not shipped) |

Regenerate mipmaps:

```bash
node scripts/generate-kac-app-icons.mjs
```
