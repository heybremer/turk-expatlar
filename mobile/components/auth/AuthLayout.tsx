import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ChevronLeft, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/lib/colors";

type Props = {
  title: string;
  subtitle?: string;
  /** Verilirse marka harfleri yerine bu ikon gösterilir. */
  icon?: LucideIcon;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

/** Giriş / kayıt / şifre ekranlarının ortak tam ekran düzeni. */
export function AuthLayout({ title, subtitle, icon: Icon, onBack, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <View
        pointerEvents="none"
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10"
      />
      <View
        pointerEvents="none"
        className="absolute -left-16 top-40 h-40 w-40 rounded-full bg-accent/5"
      />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
          >
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
        ) : null}

        <View className="flex-1 justify-center py-8">
          <View className="mb-8">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-sm">
              {Icon ? (
                <Icon size={30} color={colors.white} strokeWidth={2.2} />
              ) : (
                <Text className="text-2xl font-black tracking-tight text-white">TE</Text>
              )}
            </View>
            <Text accessibilityRole="header" className="text-3xl font-extrabold tracking-tight text-text">
              {title}
            </Text>
            {subtitle ? <Text className="mt-2 text-[15px] leading-6 text-muted">{subtitle}</Text> : null}
          </View>

          {children}
        </View>

        {footer ? <View className="mt-4 items-center">{footer}</View> : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Formlar arasındaki "veya" ayırıcı. */
export function AuthDivider({ label = "veya" }: { label?: string }) {
  return (
    <View className="my-5 flex-row items-center">
      <View className="h-px flex-1 bg-border" />
      <Text className="mx-3 text-xs font-semibold uppercase tracking-wider text-muted-light">{label}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

/** Alt kısımdaki "Hesabın yok mu? Kayıt ol" tarzı bağlantı. */
export function AuthFooterLink({
  prompt,
  label,
  onPress,
}: {
  prompt: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center">
      <Text className="text-sm text-muted">{prompt} </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={label}
        hitSlop={10}
        className="min-h-11 justify-center px-1"
      >
        <Text className="text-sm font-bold text-primary">{label}</Text>
      </Pressable>
    </View>
  );
}
