import { Image, Modal, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  url: string | null;
  onClose: () => void;
};

export function ImageViewerModal({ url, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/95">
        <TouchableOpacity
          onPress={onClose}
          style={{ position: "absolute", top: insets.top + 8, right: 16, zIndex: 10 }}
          className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        {url ? (
          <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 items-center justify-center">
            <Image source={{ uri: url }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}
