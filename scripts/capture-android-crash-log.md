# Android release crash log capture (Windows)

Use these commands **immediately after** reproducing a crash on a device with USB debugging enabled.

## Prerequisites

1. Install [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools) and add `platform-tools` to PATH.
2. Enable **Developer options → USB debugging** on the device.
3. Install the QA APK under test (uninstall older builds first).

Verify connection:

```powershell
adb devices
```

## Clear log buffer before repro

```powershell
adb logcat -c
```

## Focused fatal / JS log

```powershell
adb logcat AndroidRuntime:E ReactNativeJS:E ReactNative:E ExpoModulesCore:E *:S
```

## Broader filter

```powershell
adb logcat | findstr /I "FATAL EXCEPTION AndroidRuntime ReactNativeJS react-native Expo Reanimated Worklets SIGABRT SIGSEGV Hermes"
```

## Install APK

```powershell
adb install -r Kavya_Agri_Clinic_Client_QA_v1.0.1.apk
```

Record evidence in `ANDROID_RELEASE_CRASH_MATRIX.md`.
