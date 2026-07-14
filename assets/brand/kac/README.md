# Android launcher icon

**Source of truth:** `../logo.png`.

The production launcher icon is the approved Kavya Agri Clinic circular company logo centered on a solid white adaptive icon background.

## Rules

- Do not redesign, AI-recreate, recolor, sharpen, or retouch the company logo.
- `npm run icons:generate` only resizes and centers `../logo.png` on a 1024x1024 white canvas.
- The visible logo diameter is 720px, or 70.3% of the full canvas.
- The adaptive background color is `#FFFFFF` (`@color/iconBackground`).
- The adaptive foreground is transparent outside the circular company logo.

## Files

| File | Role |
|------|------|
| `../logo.png` | Approved original company seal |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | Published 1024x1024 white launcher masters |
| `adaptive_icon_background*.png` | Solid white adaptive background layer |
| `mask_preview_*.png` | QA only (not shipped) |

Regenerate mipmaps:

```bash
node scripts/generate-kac-app-icons.mjs
```
