/** @type {import('expo/config').ExpoConfig} */
const brand = require("./src/config/brand.config.js");
const PRODUCTION_API_HOST = "13.207.17.117";
const PRODUCTION_API_ORIGIN = `http://${PRODUCTION_API_HOST}`;
const PRODUCTION_API_BASE_URL = `${PRODUCTION_API_ORIGIN}/api/v1/`;

function normalizeApiUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return PRODUCTION_API_BASE_URL;
  let url = trimmed.replace(/\/+$/, "");
  url = url.replace(/(\/api\/v1)+$/i, "/api/v1");
  if (!/\/api\/v1$/i.test(url)) {
    url = /\/api$/i.test(url) ? `${url}/v1` : `${url}/api/v1`;
  }
  return `${url}/`;
}

const resolvedApiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_ORIGIN);
const isProductionApi = resolvedApiUrl.includes(PRODUCTION_API_HOST);

module.exports = () => ({
  name: brand.appName,
  slug: "agri-clinic-field-app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  scheme: "agriclinicfield",
  icon: brand.iconAsset,
  splash: {
    image: brand.logoAsset,
    resizeMode: "contain",
    backgroundColor: brand.splashBackgroundColor
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.kavya.agriclinic",
    infoPlist: {
      UIBackgroundModes: ["location"],
      NSLocationWhenInUseUsageDescription: `Allow ${brand.appName} to use your location while you are working in the field.`,
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Allow location all the time for route tracking during your workday.",
      NSUserNotificationsUsageDescription:
        "Send hydration, heat, and low-battery reminders during your field workday."
    }
  },
  android: {
    package: "com.kavya.agriclinic",
    versionCode: 3,
    usesCleartextTraffic: true,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "CAMERA",
      "RECORD_AUDIO",
      "READ_EXTERNAL_STORAGE",
      "READ_MEDIA_IMAGES",
      "POST_NOTIFICATIONS"
    ],
    adaptiveIcon: {
      foregroundImage: brand.adaptiveIconAsset,
      backgroundColor: brand.iconBackgroundColor
    },
    queries: [
      { package: "com.google.android.apps.maps" },
      {
        intent: {
          action: "android.intent.action.VIEW",
          data: { scheme: "google.navigation" }
        }
      },
      {
        intent: {
          action: "android.intent.action.VIEW",
          data: { scheme: "geo" }
        }
      }
    ]
  },
  web: {
    bundler: "metro"
  },
  plugins: [
    [
      "expo-location",
      {
        locationWhenInUsePermission: `Allow ${brand.appName} to use your location while you are working in the field.`,
        locationAlwaysAndWhenInUsePermission:
          "Allow location all the time for route tracking during your workday.",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true
      }
    ],
    [
      "expo-splash-screen",
      {
        image: brand.logoAsset,
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: brand.splashBackgroundColor
      }
    ],
    "expo-font",
    [
      "expo-image-picker",
      {
        photosPermission: `Allow ${brand.appName} to access photos for visit evidence and profile pictures.`,
        cameraPermission: `Allow ${brand.appName} to take photos for visits and profile pictures.`
      }
    ],
    [
      "expo-av",
      {
        microphonePermission: `Allow ${brand.appName} to record voice notes for visit evidence.`
      }
    ],
    "@react-native-community/datetimepicker",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        sounds: ["./assets/sounds/water_pour.wav", "./assets/sounds/heat.wav"]
      }
    ]
  ],
  extra: {
    eas: {
      projectId: "9393aa2a-1981-442c-8560-dcfa87f3c772"
    },
    apiUrl: resolvedApiUrl,
    apiBaseUrl: resolvedApiUrl,
    production: isProductionApi
  }
});
