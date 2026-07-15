# Android launcher icon

**Source of truth:** `../logo_icon.png`.

The production launcher icon is the Kavya Agri Clinic circular logo with transparent outer corners.

## Rules

- Do not redesign, AI-recreate, recolor, sharpen, or retouch the company logo.
- `npm run icons:generate` circular-masks and resizes `../logo_icon.png`.
- The legacy icon diameter is 960px; the adaptive foreground diameter is 720px.
- The adaptive background uses the logo's outer green (`#004D17`, `@color/iconBackground`) so Android receives the required opaque layer without white corners.
- The adaptive foreground is transparent outside the circular company logo.

## Files

| File | Role |
|------|------|
| `../logo_icon.png` | Launcher artwork source |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | Circular 1024x1024 launcher masters |
| `adaptive_icon_background*.png` | Logo-green adaptive background layer |
| `mask_preview_*.png` | QA only (not shipped) |

Regenerate mipmaps:

```bash
node scripts/generate-kac-app-icons.mjs
```
