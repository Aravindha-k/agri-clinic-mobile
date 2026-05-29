/** @type {import('expo/config').ExpoConfig} */
const PRODUCTION_API_URL = "https://agri-clinic-backend.onrender.com/api/v1/";

module.exports = () => ({
  name: "Kavya Agri Clinic",
  slug: "agri-clinic-field-app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  scheme: "agriclinicfield",
  icon: "./assets/kavya-logo.png",
  splash: {
    image: "./assets/kavya-logo.png",
    resizeMode: "contain",
    backgroundColor: "#0F5132"
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.kavya.agriclinic"
  },
  android: {
    package: "com.kavya.agriclinic",
    versionCode: 1,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "CAMERA",
      "RECORD_AUDIO",
      "READ_EXTERNAL_STORAGE",
      "READ_MEDIA_IMAGES"
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/kavya-logo.png",
      backgroundColor: "#0F5132"
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
        locationWhenInUsePermission: "Allow Kavya Agri Clinic to use your location while you are working in the field.",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/kavya-logo.png",
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: "#0F5132"
      }
    ],
    "expo-font",
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Kavya Agri Clinic to access photos for visit evidence and profile pictures.",
        cameraPermission: "Allow Kavya Agri Clinic to take photos for visits and profile pictures."
      }
    ],
    [
      "expo-av",
      {
        microphonePermission: "Allow Kavya Agri Clinic to record voice notes for visit evidence."
      }
    ]
  ],
  extra: {
    eas: {
      projectId: "9393aa2a-1981-442c-8560-dcfa87f3c772"
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL,
    production: true
  }
});
