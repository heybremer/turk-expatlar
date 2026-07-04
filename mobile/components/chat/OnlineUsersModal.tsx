import { Modal, Text, TouchableOpacity, View, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChatOnlineUser } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  visible: boolean;
  users: ChatOnlineUser[];
  currentUserId?: string;
  onClose: () => void;
  onSelectUser: (userId: string, name: string) => void;
};

const COUNTRY_FLAG: Record<string, string> = { DE: "🇩🇪", TR: "🇹🇷" };

export function OnlineUsersModal({ visible, users, currentUserId, onClose, onSelectUser }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity activeOpacity={1} className="bg-surface rounded-t-2xl pt-2 pb-4 px-4 max-h-[75%]">
          <View className="self-center w-10 h-1 rounded-full bg-border mb-3" />
          <Text className="text-base font-bold text-text text-center mb-3">
            {users.length > 0 ? `${users.length} kişi çevrimiçi` : "Çevrimiçi kimse yok"}
          </Text>

          {users.length === 0 ? (
            <Text className="text-sm text-muted text-center py-6">Şu anda bu sohbette kimse yok.</Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(u) => u.userId}
              renderItem={({ item }) => {
                const isMe = item.userId === currentUserId;
                return (
                  <TouchableOpacity
                    onPress={() => !isMe && onSelectUser(item.userId, item.displayName)}
                    disabled={isMe}
                    className="flex-row items-center gap-3 py-2.5 border-b border-border"
                  >
                    <View className="relative">
                      <Avatar name={item.displayName} url={item.avatarUrl} size="sm" />
                      <View className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-surface" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-medium text-text" numberOfLines={1}>
                        {item.displayName} {isMe ? "(Sen)" : ""}
                        {item.postalCountry ? ` ${COUNTRY_FLAG[item.postalCountry] ?? ""}` : ""}
                      </Text>
                    </View>
                    {!isMe && (
                      <View className="flex-row items-center gap-1 bg-primary/10 rounded-full px-2.5 py-1">
                        <Ionicons name="chatbubble-outline" size={13} color="#1a56db" />
                        <Text className="text-xs font-semibold text-primary">Mesaj</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
