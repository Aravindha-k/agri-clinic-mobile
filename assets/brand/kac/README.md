# FINAL approved Android launcher icon

**Source of truth:** `app_icon_1024_approved.png`

This is the production Kavya Agri Clinic launcher artwork (company seal on emerald `#0B3D2E`).

## Rules

- Do **not** redesign, AI-recreate, recolor, or retouch this artwork.
- `npm run icons:generate` only **resizes** this file into Expo + Android mipmaps.
- Adaptive background color remains `#0B3D2E` (`@color/iconBackground`).

## Files

| File | Role |
|------|------|
| `app_icon_1024_approved.png` | FINAL approved 1024×1024 master |
| `app_icon_1024_approved_source.jpg` | Original upload as provided |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | Published copies (identical) |
| `adaptive_icon_background*.png` | Solid emerald adaptive background layer |
| `mask_preview_*.png` | QA only (not shipped) |

Regenerate mipmaps:

```bash
node scripts/generate-kac-app-icons.mjs
```
