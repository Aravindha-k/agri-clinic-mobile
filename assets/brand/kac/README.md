# Android launcher icon

**Launcher + in-app source:** `../logo_circle_transparent.png` (canonical circular mark).

```bash
npm run icons:generate
```

## Adaptive layers

| Layer | Asset | Fact |
|-------|--------|------|
| Legacy / Expo `icon` | `../app_icon.png` | Circular logo on **Kavya green** (`#0F6B43`) |
| Adaptive foreground | `../adaptive_icon_foreground.png` | Circular logo only, transparent padding, **70%** safe-zone inset |
| Adaptive background | `#0F6B43` | Official Kavya green — never a white square |

## Rules

- Foreground must be the circular logo only (transparent PNG).
- Adaptive background is Kavya green (`#0F6B43`).
- No baked white square / rounded plate in foreground assets.
- Keep label `Kavya Agri`.
- Safe zone: adaptive inset 70%.
