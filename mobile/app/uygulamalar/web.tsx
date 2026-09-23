import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

import { DetailHeader } from "@/components/navigation/DetailHeader";
import { colors } from "@/lib/colors";

const tools: Record<string, { title: string; path: string }> = {
  konsolosluklar: { title: "Konsolosluklar", path: "/uygulamalar/konsolosluklar" },
  "resmi-kurumlar": { title: "Resmî Kurumlar", path: "/uygulamalar/resmi-kurumlar" },
  "gezgin-rehberi": { title: "Gezgin Rehberi", path: "/uygulamalar/gezgin-rehberi" },
  "yolculuk-telsiz": { title: "Yolculuk Telsizi", path: "/uygulamalar/yolculuk-telsiz" },
  "yeni-gelen": { title: "Yeni Gelen Rehberi", path: "/rehber/yeni-gelen" },
  "sohbet-kurallar": { title: "Sohbet Kuralları", path: "/sohbet/kurallar" },
};

export default function WebToolScreen() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  const safeTool = tool && tools[tool] ? tool : "konsolosluklar";

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title={tools[safeTool].title} />
      <WebView
        source={{ uri: `https://turkexpatlar.de${tools[safeTool].path}` }}
        startInLoadingState
        renderLoading={() => (
          <View className="absolute inset-0 items-center justify-center bg-background">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
      />
    </View>
  );
}
