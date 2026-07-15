# Android launcher icon

**Source of truth:** `../logo_icon.png`.

The production launcher icon is the approved Kavya Agri-Horti Clinic circular logo centered on white.

## Rules

- Do not redesign, AI-recreate, recolor, sharpen, or retouch the company logo.
- `npm run icons:generate` circular-masks and resizes `../logo_icon.png`.
- The legacy and adaptive logo diameters are 720px (70.3% of the 1024px master).
- The adaptive background is opaque white (`#FFFFFF`, `@color/iconBackground`).
- The adaptive foreground is transparent outside the circular company logo.
- Keep the launcher label `Kavya Agri` unchanged.

## Files

| File | Role |
|------|------|
| `../logo_icon.png` | Launcher artwork source |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | Circular 1024x1024 launcher masters |
| `adaptive_icon_background*.png` | Opaque white adaptive background layer |
| `mask_preview_*.png` | QA only (not shipped) |

Regenerate mipmaps:

```bash
node scripts/generate-kac-app-icons.mjs
```
