# Android launcher icon

**Source of truth:** `../logo_icons.png` (promoted to `../logo_icon.png`).

```bash
node scripts/promote-logo-icons.mjs
```

## Rules

- Artwork is the approved KAC + medical-cross brand mark on white.
- Adaptive background is opaque white (`#FFFFFF`, `@color/iconBackground`).
- Keep the launcher label `Kavya Agri` unchanged.

## Files

| File | Role |
|------|------|
| `../logo_icons.png` | Designer source |
| `../logo_icon.png` | In-app + promoted launcher source |
| `../app_icon.png` | Expo / legacy square icon |
| `../adaptive_icon_foreground.png` | Adaptive foreground |
| `app_icon_1024.png` / `app_icon_1024_solid.png` | 1024 masters |
| `mask_preview_*.png` / `preview_*.png` | QA only (not shipped) |
