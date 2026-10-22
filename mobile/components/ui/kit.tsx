import { ReactNode } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { ChevronRight, Plus, type LucideIcon } from "lucide-react-native";

import { colors } from "@/lib/colors";

/** Bölüm başlığı: solda kalın başlık, sağda isteğe bağlı "Tümü" bağlantısı. */
export function SectionHeader({
  title,
  actionLabel = "Tümü",
  onAction,
  className = "",
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <View className={`mb-3 flex-row items-center justify-between ${className}`}>
      <Text className="text-[17px] font-extrabold tracking-tight text-text">{title}</Text>
      {onAction ? (
        <Pressable onPress={onAction} hitSlop={8} className="flex-row items-center gap-0.5 active:opacity-60">
          <Text className="text-sm font-semibold text-primary">{actionLabel}</Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** İki-dört seçenekli sekme seçici (ör. "Odalar / Mesajlar"). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <View className={`flex-row rounded-2xl bg-background p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={
              active
                ? {
                    shadowColor: colors.text,
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }
                : undefined
            }
            className={`min-h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl ${
              active ? "bg-surface" : "bg-transparent"
            }`}
          >
            <Text className={`text-sm font-semibold ${active ? "text-text" : "text-muted"}`}>{o.label}</Text>
            {o.badge ? (
              <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1">
                <Text className="text-[10px] font-bold text-white">{o.badge > 9 ? "9+" : o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Renkli zeminli kare ikon kutusu. */
export function IconTile({
  icon: Icon,
  tint = colors.primary,
  size = 44,
}: {
  icon: LucideIcon;
  tint?: string;
  size?: number;
}) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: `${tint}14` }}
      className="items-center justify-center"
    >
      <Icon size={Math.round(size * 0.48)} color={tint} strokeWidth={2.1} />
    </View>
  );
}

/** Ayar/menü satırlarını tek kartta, aralarında çizgiyle gruplar. */
export function ListGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <View className={`overflow-hidden rounded-3xl border border-border bg-surface ${className}`}>{children}</View>
  );
}

/** ListGroup içinde kullanılan ikonlu satır. */
export function ListRow({
  icon,
  tint,
  title,
  subtitle,
  right,
  onPress,
  destructive = false,
  first = false,
}: {
  icon?: LucideIcon;
  tint?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Grubun ilk satırıysa üst çizgi çizilmez. */
  first?: boolean;
}) {
  const color = destructive ? colors.danger : tint;
  const body = (
    <>
      {icon ? <IconTile icon={icon} tint={color} size={36} /> : null}
      <View className="flex-1">
        <Text className={`text-[15px] font-semibold ${destructive ? "text-danger" : "text-text"}`}>{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs leading-4 text-muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <ChevronRight size={18} color={colors.mutedLight} /> : null}
    </>
  );
  const cls = `min-h-14 flex-row items-center gap-3 px-4 py-3 ${first ? "" : "border-t border-border"}`;
  if (!onPress) return <View className={cls}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={`${cls} active:bg-background`}>
      {body}
    </Pressable>
  );
}

/** Başlıktaki küçük birincil eylem butonu (ör. "+ İlan ver"). */
export function HeaderButton({
  label,
  onPress,
  icon: Icon = Plus,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-10 flex-row items-center gap-1 rounded-full bg-primary px-3.5 active:opacity-80"
    >
      <Icon size={16} color={colors.white} strokeWidth={2.6} />
      <Text className="text-sm font-bold text-white">{label}</Text>
    </Pressable>
  );
}

/** Metin + değer satırlı küçük istatistik kutusu. */
export function StatTile({ value, label, className = "" }: { value: string | number; label: string; className?: string }) {
  return (
    <View className={`flex-1 items-center rounded-2xl bg-background px-2 py-3 ${className}`}>
      <Text className="text-lg font-extrabold text-text">{value}</Text>
      <Text className="mt-0.5 text-xs text-muted">{label}</Text>
    </View>
  );
}

/** İkon + metin tek satır meta bilgi (konum, tarih vb.). */
export function MetaItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon size={13} color={colors.muted} />
      <Text className="text-xs text-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Araç/sayfa girişindeki ikonlu tanıtım kartı. */
export function ToolHero({
  icon: Icon,
  title,
  subtitle,
  tint = colors.primary,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tint?: string;
  children?: ReactNode;
}) {
  return (
    <View className="mb-5 rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-center gap-4">
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${tint}14` }}
        >
          <Icon size={26} color={tint} strokeWidth={2.2} />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-text">{title}</Text>
          {subtitle ? <Text className="mt-1 text-sm leading-5 text-muted">{subtitle}</Text> : null}
        </View>
      </View>
      {children ? <View className="mt-4">{children}</View> : null}
    </View>
  );
}

export type ChipOption<T extends string> = { value: T; label: string };

/** Yatay kaydırılabilir filtre çipleri. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={className}
      contentContainerStyle={{ gap: 8, paddingRight: 8 }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`min-h-9 justify-center rounded-full border px-4 ${
              active ? "border-primary bg-primary" : "border-border bg-surface"
            }`}
          >
            <Text className={`text-sm font-semibold ${active ? "text-white" : "text-muted"}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <Text className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-muted">
      {children}
      {count !== undefined ? <Text className="font-medium normal-case"> ({count})</Text> : null}
    </Text>
  );
}

/** Dokununca telefon/e-posta/harita/web bağlantısını açan satır. */
export function LinkRow({
  icon: Icon,
  label,
  url,
  emphasis = false,
}: {
  icon: LucideIcon;
  label: string;
  url?: string;
  emphasis?: boolean;
}) {
  const content = (
    <>
      <Icon size={17} color={emphasis ? colors.primary : colors.muted} />
      <Text
        className={`flex-1 text-sm leading-5 ${emphasis ? "font-semibold text-primary" : "text-text"}`}
      >
        {label}
      </Text>
    </>
  );
  if (!url) {
    return <View className="min-h-10 flex-row items-center gap-3">{content}</View>;
  }
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="link"
      className="min-h-11 flex-row items-center gap-3 active:opacity-60"
    >
      {content}
    </Pressable>
  );
}

export function TipBox({
  title,
  children,
  tone = "primary",
}: {
  title?: string;
  children: ReactNode;
  tone?: "primary" | "warning";
}) {
  const toneClass =
    tone === "warning" ? "border-warning/30 bg-warning/5" : "border-primary/20 bg-primary/5";
  return (
    <View className={`rounded-2xl border p-4 ${toneClass}`}>
      {title ? <Text className="mb-1 text-sm font-bold text-text">{title}</Text> : null}
      <Text className="text-sm leading-5 text-muted">{children}</Text>
    </View>
  );
}

export function Pill({ label, tone = "primary" }: { label: string; tone?: "primary" | "muted" | "accent" }) {
  const cls =
    tone === "accent"
      ? "bg-accent/10 text-accent"
      : tone === "muted"
        ? "bg-background text-muted"
        : "bg-primary/10 text-primary";
  const [bg, text] = cls.split(" ");
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-bold ${text}`}>{label}</Text>
    </View>
  );
}
