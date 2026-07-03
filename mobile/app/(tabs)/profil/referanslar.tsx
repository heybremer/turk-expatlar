import { useState } from "react";
import { FlatList, RefreshControl, Share, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/lib/auth";
import { api, ReferralInfo } from "@/lib/api";
import { COUNTRY_FLAG, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function ReferanslarimScreen() {
  const { token } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["me-referrals"],
    queryFn: () => api.get<ReferralInfo>("/users/me/referrals", token),
    enabled: !!token,
  });

  async function copyReferralCode() {
    if (!data?.referralCode) return;
    await Clipboard.setStringAsync(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareReferralLink() {
    if (!data?.referralCode) return;
    const link = `https://turkexpatlar.de/kayit?ref=${data.referralCode}`;
    try {
      await Share.share({
        message: `Türk Expatlar'a katıl — Almanya'daki Türkçe topluluk platformu. Davet kodum: ${data.referralCode}\n${link}`,
      });
    } catch {
      // ignore
    }
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title="Referanslarım" subtitle="Arkadaşlarını davet et" />

      <FlatList
        data={data?.referrals ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <Card>
              <Text className="text-sm font-semibold text-text">Referans Kodun</Text>
              <Text className="text-xs text-muted mt-1">
                Bu kodla kayıt olan kişiler senin referansın olarak görünür. Toplam:{" "}
                <Text className="font-semibold text-text">{data?.referralCount ?? 0}</Text> kişi
              </Text>
              <Text className="mt-3 font-mono text-2xl font-bold tracking-wider text-primary">
                {data?.referralCode ?? "—"}
              </Text>
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity onPress={() => void copyReferralCode()} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5">
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color="#1a56db" />
                  <Text className="text-sm font-medium text-primary">{copied ? "Kopyalandı" : "Kodu Kopyala"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void shareReferralLink()} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5">
                  <Ionicons name="share-social-outline" size={15} color="#1a56db" />
                  <Text className="text-sm font-medium text-primary">Paylaş</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {data?.referredBy && (
              <Card>
                <Text className="text-xs text-muted">Seni davet eden</Text>
                <Text className="text-sm font-medium text-text mt-1">
                  {data.referredBy.profile?.displayName ?? "—"}
                  {data.referredBy.profile?.postalCountry && ` ${COUNTRY_FLAG[data.referredBy.profile.postalCountry]}`}
                </Text>
                {data.referredBy.referralCode && (
                  <Text className="text-xs font-mono text-primary mt-0.5">{data.referredBy.referralCode}</Text>
                )}
              </Card>
            )}

            {(data?.referrals.length ?? 0) > 0 && (
              <Text className="text-sm font-semibold text-text px-1">Referansınla gelenler</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
            <Text className="text-sm font-medium text-text flex-1" numberOfLines={1}>
              {item.profile?.displayName ?? item.email}
              {item.profile?.postalCountry && ` ${COUNTRY_FLAG[item.profile.postalCountry]}`}
            </Text>
            <Text className="text-xs text-muted ml-2">{formatDate(item.createdAt)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title="Henüz referansın yok" subtitle="Kodunu paylaşarak arkadaşlarını davet et" />
        }
      />
    </View>
  );
}
