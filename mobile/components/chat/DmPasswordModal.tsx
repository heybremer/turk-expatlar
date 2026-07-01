import { useEffect, useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

type Props = {
  visible: boolean;
  chatId: string | null;
  token: string | null;
  hasPassword: boolean;
  onClose: () => void;
  onUpdated: (hasPassword: boolean) => void;
};

export function DmPasswordModal({ visible, chatId, token, hasPassword, onClose, onUpdated }: Props) {
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
    if (!chatId || !token) return;
    setError("");
    if (password && password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }
    if (password && password.length < 4) {
      setError("Şifre en az 4 karakter olmalı");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/chat/${chatId}/password`, { password: password || undefined }, token);
      onUpdated(!!password);
      onClose();
    } catch {
      setError("Şifre kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!chatId || !token) return;
    setSaving(true);
    try {
      await api.patch(`/chat/${chatId}/password`, {}, token);
      onUpdated(false);
      onClose();
    } catch {
      setError("Şifre kaldırılamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 items-center justify-center px-6">
        <View className="w-full bg-surface rounded-2xl p-5">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                <Ionicons name="key-outline" size={18} color="#1a56db" />
              </View>
              <View>
                <Text className="font-semibold text-text">Sohbet Şifresi</Text>
                <Text className="text-xs text-muted">Bu özel sohbete erişim şifresi</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={hasPassword ? "Yeni şifre (boş bırak = değiştirme)" : "Şifre belirle"}
            placeholderTextColor="#9ca3af"
            secureTextEntry
            className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text mb-2.5"
          />
          {password ? (
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Şifreyi tekrar girin"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text mb-2.5"
            />
          ) : null}
          {error ? <Text className="text-xs text-danger mb-2">{error}</Text> : null}

          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity
              onPress={() => void handleSave()}
              disabled={saving}
              className={`flex-1 bg-primary rounded-xl py-2.5 items-center ${saving ? "opacity-50" : ""}`}
            >
              <Text className="text-white text-sm font-semibold">{saving ? "Kaydediliyor…" : "Kaydet"}</Text>
            </TouchableOpacity>
            {hasPassword && (
              <TouchableOpacity
                onPress={() => void handleRemove()}
                disabled={saving}
                className="border border-border rounded-xl px-4 py-2.5 items-center justify-center"
              >
                <Text className="text-sm text-muted">Kaldır</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
