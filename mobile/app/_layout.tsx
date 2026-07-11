import "../global.css";
import { useEffect } from "react";
import { Redirect, Stack, useRootNavigationState, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { NavigationMenuProvider } from "@/components/navigation/NavigationMenu";
import { initSentry, Sentry } from "@/lib/sentry";

SplashScreen.preventAutoHideAsync();
initSentry();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, _hasHydrated } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  usePushNotifications();

  useEffect(() => {
    if (!_hasHydrated) return;

    void SplashScreen.hideAsync();
  }, [_hasHydrated]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!useAuth.getState()._hasHydrated) {
        useAuth.getState().setHydrated();
      }
      void SplashScreen.hideAsync();
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  if (!_hasHydrated || !navigationState?.key) {
    return null;
  }

  const inAuthGroup = segments[0] === "(auth)";
  const onIndex = !segments[0];
  const onOAuthCallback = segments[0] === "oauth";

  if (!token && !inAuthGroup && !onOAuthCallback) {
    return <Redirect href="/(auth)/giris" />;
  }

  if (token && (inAuthGroup || onIndex)) {
    return <Redirect href="/(tabs)/akis" />;
  }

  return <>{children}</>;
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <StatusBar style="auto" />
            <NavigationMenuProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="rehber/[id]" />
                <Stack.Screen name="isler/[id]" />
                <Stack.Screen name="uygulamalar/haberler" />
                <Stack.Screen name="uygulamalar/tatil-gunleri" />
              </Stack>
            </NavigationMenuProvider>
          </AuthGuard>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
