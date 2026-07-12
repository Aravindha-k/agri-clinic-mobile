# Map tile hosting for Kavya Agri Clinic

Kavya Agri Clinic uses **MapLibre React Native** with a **style JSON URL** — not Google Maps and not raw OpenStreetMap tile scraping from the app.

Configure via environment variables (see `.env.example`):

| Variable | When used |
|----------|-----------|
| `EXPO_PUBLIC_MAP_STYLE_URL` | Production / default |
| `EXPO_PUBLIC_MAP_STYLE_URL_STAGING` | Staging / preview builds |
| `EXPO_PUBLIC_MAP_STYLE_URL_DEV` | Local development override |

The resolved URL is also exposed at build time as `extra.mapStyleUrl` in `app.config.js` for runtime reads through `expo-constants`.

---

## Important limitations

### Public OSM / demo tiles are not unlimited production backends

- **`tile.openstreetmap.org`** and similar public endpoints have [strict usage policies](https://operations.osmfoundation.org/policies/tiles/) and must not be used as an unrestricted production tile source for a field workforce app.
- **[MapLibre demo tiles](https://github.com/maplibre/demotiles)** (`https://demotiles.maplibre.org/style.json`) are intended for **development and internal QA only**.

The GitHub Actions QA APK workflow currently sets:

```text
EXPO_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

This is lawful for internal QA builds. **Before a wide production rollout**, point production at a proper tile/style provider.

### Offline base maps are not implemented

The app **does** preserve offline **GPS route data**, visit markers, and workday flows when tiles are unavailable.

The app **does not** ship offline map tile regions. When tiles cannot load (offline or style failure), `FieldMapView` shows a safe message and Day summary / End Workday remain usable.

---

## Recommended production options

Choose one lawful approach for production:

1. **Free-tier provider** — e.g. [MapTiler](https://www.maptiler.com/cloud/) or [Stadia Maps](https://stadiamaps.com/) with a MapLibre-compatible style URL and usage limits appropriate to your fleet size.
2. **Self-hosted tiles** — run [tileserver-gl](https://github.com/maptiler/tileserver-gl) or similar and host your own `style.json` + tiles on infrastructure you control.
3. **Organisation-provided style** — any MapLibre Style Spec JSON URL your IT team maintains.

No provider API token is hardcoded in this repository. If a provider requires a key, embed it only in the **style URL or style JSON** supplied through secrets / env — never commit tokens to Git.

---

## Local development

1. Copy `.env.example` → `.env.local`
2. For quick local map testing:

   ```env
   EXPO_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
   ```

3. **Rebuild the native app** after installing MapLibre (not compatible with Expo Go):

   ```bash
   npx expo prebuild --platform android --clean
   npx expo run:android
   ```

---

## GitHub Actions / release builds

Set `EXPO_PUBLIC_MAP_STYLE_URL` in `.github/workflows/android-apk.yml` (or repository variables) to a QA-safe or production style URL before client delivery.

Maps no longer require `GOOGLE_MAPS_ANDROID_API_KEY` or Google Play Maps SDK manifest metadata.

---

## Fallback behaviour

If the style URL is missing, invalid, or tiles fail to load:

> Map is temporarily unavailable.  
> Your route and visit data are still being recorded.

GPS capture, offline queues, visits, and workday actions are unchanged.
