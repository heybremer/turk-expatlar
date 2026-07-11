import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    sendDefaultPii: false,
  });
}

export { Sentry };
