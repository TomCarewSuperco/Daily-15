import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Permanent once the app is submitted to the App Store. Must match the App ID in the Apple Developer account.
  appId: "com.carewtechnologies.daily15",
  appName: "DAILY 15",
  webDir: "dist",
  ios: {
    contentInset: "never",
    backgroundColor: "#f5f5f5",
    scheme: "DAILY 15",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#141414",
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: "#c56a2c",
    },
  },
};

export default config;
