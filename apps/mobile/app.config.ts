import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "MIRA",
  slug: "mira",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "mira",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "cloud.mirajob.mira",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
    package: "cloud.mirajob.mira",
  },
  web: {
    bundler: "metro",
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true,
  },
});
