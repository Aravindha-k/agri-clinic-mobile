# UI screenshot review pack

Capture these four screens after running the app on a device or emulator:

| Screen | Navigation path | Output file |
|--------|-----------------|-------------|
| Home | Main tab → Home | `home.png` |
| Profile | Main tab → Profile | `profile.png` |
| Farmer Detail | Farmers → open any farmer | `farmer-detail.png` |
| Visit Detail | Visits → open any visit | `visit-detail.png` |

## Quick capture (Android + USB debugging)

```powershell
cd d:\agri-clinic-mobile
.\scripts\capture-screenshots.ps1
```

Manual capture while the target screen is visible:

```powershell
adb exec-out screencap -p > docs\screenshots\home.png
```

## Review checklist

- [ ] Home: white welcome card, large logo, prominent employee photo, KPI cards on soft green background
- [ ] Profile: centered hero photo, clear stats, white cards
- [ ] Farmer Detail: readable hierarchy, no heavy green gradients
- [ ] Visit Detail: evidence section + GPS watermark flow on new photos
- [ ] Logo sizes consistent with splash/login

Do **not** run EAS APK build until these screenshots are approved.
