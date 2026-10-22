import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { MessageCircle, Users, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatOnlineUser } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { IconTile } from "@/components/ui/kit";
import { SearchBar } from "@/components/ui/SearchBar";
import { normalizeTr } from "@/components/chat/search";

type Props = {
  visible: boolean;
  users: ChatOnlineUser[];
  currentUserId?: string;
  onClose: () => void;
  onSelectUser: (userId: string, name: string) => void;
};

const COUNTRY_FLAG: Record<string, string> = { DE: "🇩🇪", TR: "🇹🇷" };
const SEARCH_THRESHOLD = 8;

export function OnlineUsersModal({ visible, users, currentUserId, onClose, onSelectUser }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  const sorted = useMemo(() => {
    const nq = normalizeTr(query);
    return [...users]
      .filter((u) => !nq || normalizeTr(u.displayName).includes(nq))
      .sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        return a.displayName.localeCompare(b.displayName, "tr");
      });
  }, [users, query, currentUserId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40" accessibilityLabel="Kapat">
          <Pressable
            onPress={() => {}}
            className="max-h-[75%] rounded-t-3xl bg-surface px-4 pt-2.5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-border" />
            <View className="mb-3 flex-row items-center gap-3 px-1">
              <IconTile icon={Users} tint={colors.success} size={40} />
              <View className="flex-1">
                <Text className="text-[17px] font-bold text-text">
                  {users.length > 0 ? `${users.length} kişi çevrimiçi` : "Çevrimiçi kimse yok"}
                </Text>
                <Text className="text-xs text-muted">Özel mesaj için bir kişiye dokunun</Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-background active:opacity-70"
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            {users.length > SEARCH_THRESHOLD ? (
              <SearchBar value={query} onChangeText={setQuery} placeholder="Çevrimiçi kişilerde ara…" className="mb-2" />
            ) : null}

            {sorted.length === 0 ? (
              <Text className="py-8 text-center text-sm text-muted">
                {users.length === 0 ? "Şu anda bu sohbette kimse yok." : "Eşleşen kişi yok."}
              </Text>
            ) : (
              <FlatList
                data={sorted}
                keyExtractor={(u) => u.userId}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isMe = item.userId === currentUserId;
                  const flag = item.postalCountry ? COUNTRY_FLAG[item.postalCountry] : undefined;
                  return (
                    <Pressable
                      onPress={() => !isMe && onSelectUser(item.userId, item.displayName)}
                      disabled={isMe}
                      accessibilityRole="button"
                      accessibilityLabel={isMe ? `${item.displayName} (Sen)` : `${item.displayName} ile mesajlaş`}
                      className="min-h-14 flex-row items-center gap-3 rounded-2xl px-2 py-2 active:bg-background"
                    >
                      <View>
                        <Avatar name={item.displayName} url={item.avatarUrl} size="sm" />
                        <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
                      </View>
                      <View className="min-w-0 flex-1 flex-row items-center gap-1">
                        <Text className="flex-shrink text-[15px] font-semibold text-text" numberOfLines={1}>
                          {item.displayName}
                        </Text>
                        {isMe ? <Text className="text-[15px] text-muted">(Sen)</Text> : null}
                        {flag ? <Text className="text-[13px]">{flag}</Text> : null}
                      </View>
                      {!isMe && (
                        <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5">
                          <MessageCircle size={13} color={colors.primary} />
                          <Text className="text-xs font-bold text-primary">Mesaj</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
