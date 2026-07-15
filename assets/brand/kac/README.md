# Android launcher icon

**Source of truth:** `../logo_icon.png`.

The production launcher icon is the approved Kavya Agri-Horti Clinic circular badge centered **inside a white circular orbit** (with transparent corners outside that orbit).

## Rules

- Do not redesign, AI-recreate, recolor, sharpen, or retouch the company logo.
- `logo_icon.png` composition: white orbit + green badge inset (~66%) so OEM round/squircle masks never clip the green ring.
- `npm run icons:generate` ships the source as-is onto legacy (white square) and adaptive (transparent corners) layers.
- The adaptive background is opaque white (`#FFFFFF`, `@color/iconBackground`).
- Keep the launcher label `Kavya Agri` unchanged.

## Files

| File | Role |
|------|------|
| `../logo_icon.png` | Launcher artwork source (white orbit + inset badge) |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | Circular 1024x1024 launcher masters |
| `adaptive_icon_background*.png` | Opaque white adaptive background layer |
| `mask_preview_*.png` | QA only (not shipped) |

Regenerate mipmaps:

```bash
node scripts/generate-kac-app-icons.mjs
```
