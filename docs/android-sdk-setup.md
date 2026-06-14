# Android SDK setup (Windows)

Required for `npx expo run:android` and `adb`.

## Install

1. Download [Android Studio](https://developer.android.com/studio).
2. Run installer (include **Android SDK**).
3. Open **SDK Manager** and install:
   - Android SDK Platform (API 35 or 34)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools

Default SDK folder: `C:\Users\<you>\AppData\Local\Android\Sdk`

## Configure environment

In PowerShell from project root:

```powershell
.\scripts\setup-android-sdk.ps1
```

Close the terminal, open a new one, then verify:

```powershell
adb devices
cd d:\agri-clinic-mobile
npx expo run:android
```

## Phone: USB debugging

1. Enable **Developer options** and **USB debugging** on the phone.
2. Connect USB, accept the debugging prompt.
3. `adb devices` should list your device.

## No SDK yet?

Use **Expo Go** for quick UI tests:

```powershell
npx expo start -c
# or if LAN fails:
npm run start:tunnel
```

Full native features (watermark burn-in, screenshot block) need `expo run:android` or an EAS APK.
