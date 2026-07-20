# Brand assets

## Canonical in-app logo

`assets/brand/logo_circle_transparent.png`

Used for:

- In-app `<CompanyLogo />` (`src/config/brand.ts` → `LOGO_IMAGE`)
- Login header mark (on top of the field photo)
- Today / headers / splash logo
- Native / Expo splash (`app.config.js` → `logoAsset` / `splashImageAsset`)
- Launcher generation source (`npm run icons:generate`)

Never put a white square plate behind this mark in UI.

## Login field background (photo only)

`assets/login/login_field_bg.jpg`

Full-bleed Login header atmosphere (field/leaves, no UI). Not a logo — do not use on Today, splash, or the launcher.

`assets/login/login_field_hero.jpg` is the design mockup reference only — **do not render it in-app** (it contains a baked-in login card and causes a ghost double login).

## Launcher-only (not used in UI)

- `assets/brand/app_icon.png`
- `assets/brand/adaptive_icon_foreground.png`
