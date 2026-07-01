import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EMOJI_REACTIONS } from "@/components/chat/ChatMessageBubble";

type Props = {
  visible: boolean;
  canDelete: boolean;
  canCopy?: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onReply: () => void;
  onCopy?: () => void;
  onForward?: () => void;
};

export function MessageActionSheet({
  visible,
  canDelete,
  canCopy,
  onClose,
  onReact,
  onDelete,
  onReply,
  onCopy,
  onForward,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity activeOpacity={1} className="bg-surface rounded-t-2xl pt-2 pb-6 px-4">
          <View className="self-center w-10 h-1 rounded-full bg-border mb-3" />

          <View className="flex-row justify-around bg-background rounded-2xl py-2.5 mb-3">
            {EMOJI_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  onReact(emoji);
                  onClose();
                }}
                className="px-1"
              >
                <Text className="text-2xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => {
              onReply();
              onClose();
            }}
            className="flex-row items-center gap-3 py-3"
          >
            <Ionicons name="arrow-undo-outline" size={18} color="#1a56db" />
            <Text className="text-sm font-medium text-text">Yanıtla</Text>
          </TouchableOpacity>

          {canCopy && onCopy && (
            <TouchableOpacity
              onPress={() => {
                onCopy();
                onClose();
              }}
              className="flex-row items-center gap-3 py-3"
            >
              <Ionicons name="copy-outline" size={18} color="#374151" />
              <Text className="text-sm font-medium text-text">Kopyala</Text>
            </TouchableOpacity>
          )}

          {onForward && (
            <TouchableOpacity
              onPress={() => {
                onForward();
                onClose();
              }}
              className="flex-row items-center gap-3 py-3"
            >
              <Ionicons name="arrow-redo-outline" size={18} color="#374151" />
              <Text className="text-sm font-medium text-text">İlet</Text>
            </TouchableOpacity>
          )}

          {canDelete && (
            <TouchableOpacity
              onPress={() => {
                onDelete();
                onClose();
              }}
              className="flex-row items-center gap-3 py-3"
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text className="text-sm font-medium text-danger">Mesajı sil</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} className="flex-row items-center gap-3 py-3">
            <Ionicons name="close-outline" size={18} color="#6b7280" />
            <Text className="text-sm font-medium text-muted">Kapat</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
