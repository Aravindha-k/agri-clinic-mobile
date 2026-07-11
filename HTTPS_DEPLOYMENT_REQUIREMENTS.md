# HTTPS deployment requirements — Kavya Agri Clinic

**Date:** 11 July 2026  
**Status:** Production TLS is a **hard prerequisite**. Phase 1 blocks silent cleartext production builds.

---

## Current insecure URL locations (before / during Phase 1)

| Location | Previous value |
|----------|----------------|
| `d:\agri-clinic-mobile\.env.production` | `http://13.207.17.117/api/v1/` |
| `d:\agri-clinic-mobile\src\api\config.ts` | Hardcoded `http://13.207.17.117` fallback |
| `d:\agri-clinic-mobile\app.config.js` | Hardcoded HTTP origin + `usesCleartextTraffic: true` |
| Admin `.env` | `http://127.0.0.1:8000` (OK for **local dev only**) |
| Backend EC2 | Historically served HTTP on public IP |

---

## Required infrastructure

1. **Domain** pointing at the API host (recommended) or ACM/ALB certificate on the existing EC2 IP via HTTPS load balancer.
2. **TLS certificate** (AWS ACM recommended with Application Load Balancer, or nginx + Let's Encrypt on EC2).
3. **Redirect** HTTP → HTTPS on the edge.
4. Update security groups / listeners for 443.

AWS services typically involved:

- EC2 (current app host)
- Optional: **ALB + ACM**
- Optional: Route 53 for DNS
- Optional: S3 for media (`USE_S3=true`) remains independent of API TLS

---

## Environment variables

### Mobile (EAS / `.env.production`)

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1/
EXPO_PUBLIC_ENV=production
# Emergency only — never ship to clients:
# EXPO_PUBLIC_ALLOW_INSECURE_HTTP=1
```

Release builds **throw at startup** if:

- Env URL is missing, or
- URL is `http://` without `EXPO_PUBLIC_ALLOW_INSECURE_HTTP=1`

### Admin (`agri-admin-new`)

```bash
# .env.production
VITE_API_URL=https://api.your-domain.com
```

Production Vite builds throw if `VITE_API_URL` is missing or not HTTPS.

### Backend

- Set `SECURE_SSL_REDIRECT=True` (or terminate TLS at ALB and trust `X-Forwarded-Proto`)
- Update `CSRF_TRUSTED_ORIGINS` / `CORS` for `https://` admin origin
- Ensure `ALLOWED_HOSTS` includes the API domain

---

## Mobile / admin build changes (Phase 1)

- Mobile `config.ts` defaults scheme to `https://` and refuses cleartext in release.
- `app.config.js` sets `usesCleartextTraffic` only when not a production env profile.
- Admin axios validates HTTPS for `import.meta.env.PROD`.

---

## Verification steps

1. `curl -I https://api.your-domain.com/healthz/` → 200
2. Mobile release build with HTTPS env → login succeeds
3. Admin production build with `VITE_API_URL=https://…` → login succeeds
4. Confirm no `http://13.207.17.117` remains in release configs
5. Certificate expiry monitoring enabled

**Until HTTPS exists on the server, do not ship client-facing production APKs.** Internal QA may use local HTTP (`__DEV__`) or a temporary insecure override that must not be used for client delivery.
