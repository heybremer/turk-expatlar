import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { KeyRound, Lock, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/colors";
import { haptics } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { IconTile } from "@/components/ui/kit";

type Props = {
  visible: boolean;
  chatId: string | null;
  token: string | null;
  hasPassword: boolean;
  onClose: () => void;
  onUpdated: (hasPassword: boolean) => void;
};

export function DmPasswordModal({ visible, chatId, token, hasPassword, onClose, onUpdated }: Props) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setPassword("");
      setConfirm("");
      setError("");
    }
  }, [visible]);

  async function handleSave() {
    if (!chatId || !token || saving) return;
    setError("");
    const trimmed = password.trim();
    // Boş şifre gönderilirse sunucu mevcut şifreyi kaldırır; bu yalnızca "Kaldır" ile yapılmalı
    if (!trimmed) {
      setError(hasPassword ? "Yeni şifreyi girin veya şifreyi kaldırın" : "Bir şifre belirleyin");
      return;
    }
    if (trimmed.length < 4) {
      setError("Şifre en az 4 karakter olmalı");
      return;
    }
    if (trimmed !== confirm.trim()) {
      setError("Şifreler eşleşmiyor");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/chat/${chatId}/password`, { password: trimmed }, token);
      haptics.success();
      onUpdated(true);
      onClose();
    } catch (err) {
      haptics.error();
      setError(err instanceof ApiError ? err.message : "Şifre kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  function handleRemove() {
    if (!chatId || !token || saving) return;
    Alert.alert("Şifreyi kaldır", "Bu sohbete artık şifresiz erişilebilecek.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Kaldır",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await api.patch(`/chat/${chatId}/password`, {}, token);
            haptics.success();
            onUpdated(false);
            onClose();
          } catch (err) {
            haptics.error();
            setError(err instanceof ApiError ? err.message : "Şifre kaldırılamadı");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose} accessibilityLabel="Kapat">
          <Pressable
            onPress={() => {}}
            className="rounded-t-3xl bg-surface px-5 pt-2.5"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-border" />
            <View className="mb-5 flex-row items-center gap-3">
              <IconTile icon={KeyRound} size={44} />
              <View className="flex-1">
                <Text className="text-[17px] font-bold text-text">Sohbet Şifresi</Text>
                <Text className="text-xs text-muted">Bu özel sohbete erişim şifresi</Text>
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

            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder={hasPassword ? "Yeni şifre" : "Şifre belirle (en az 4 karakter)"}
              icon={Lock}
              password
              accessibilityLabel={hasPassword ? "Yeni şifre" : "Şifre"}
              containerClassName="mb-3"
            />
            {password ? (
              <TextField
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Şifreyi tekrar girin"
                icon={Lock}
                password
                accessibilityLabel="Şifre tekrar"
                containerClassName="mb-3"
                onSubmitEditing={() => void handleSave()}
                returnKeyType="done"
              />
            ) : null}
            {error ? (
              <Text className="mb-3 text-xs font-medium text-danger" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : (
              <Text className="mb-3 text-xs leading-4 text-muted">
                Şifre belirlendiğinde bu sohbete her girişte şifre sorulur. Karşı taraf da aynı şifreyi kullanır.
              </Text>
            )}

            <View className="mt-1 flex-row gap-2">
              <Button
                label={hasPassword ? "Şifreyi değiştir" : "Şifre belirle"}
                loading={saving}
                onPress={() => void handleSave()}
                disabled={saving}
                className="flex-1"
              />
              {hasPassword && (
                <Button label="Kaldır" variant="secondary" onPress={handleRemove} disabled={saving} />
              )}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
