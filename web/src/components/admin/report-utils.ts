export const REPORT_TARGET_LABELS: Record<string, string> = {
  FORUM_TOPIC: "Forum Konusu",
  FORUM_REPLY: "Forum Cevabı",
  USER: "Kullanıcı",
  BUSINESS: "İşletme",
  BUSINESS_REVIEW: "İşletme Yorumu",
  EVENT: "Etkinlik",
  MESSAGE: "Mesaj",
  JOB_POSTING: "İş İlanı",
  COURIER_REQUEST: "Seyahat İsteği",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  REVIEWED: "İncelendi",
  RESOLVED: "Çözüldü",
  DISMISSED: "Reddedildi",
};

export type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
  targetLabel?: string;
  reportedUserId?: string | null;
  reportedUserName?: string | null;
  reporter?: {
    id: string;
    email: string;
    profile?: { displayName: string } | null;
  };
};

export type ReportsResponse = {
  items: AdminReport[];
  total: number;
  page: number;
  totalPages: number;
};

export function normalizeReportsResponse(raw: unknown, page = 1): ReportsResponse {
  if (Array.isArray(raw)) {
    return {
      items: raw as AdminReport[],
      total: raw.length,
      page: 1,
      totalPages: 1,
    };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Partial<ReportsResponse>;
    const items = Array.isArray(obj.items) ? obj.items : [];
    const total = typeof obj.total === "number" ? obj.total : items.length;
    const totalPages = typeof obj.totalPages === "number" ? obj.totalPages : Math.max(1, Math.ceil(total / 20));
    return {
      items,
      total,
      page: typeof obj.page === "number" ? obj.page : page,
      totalPages,
    };
  }
  return { items: [], total: 0, page, totalPages: 1 };
}

export function complaintScoreColor(score: number) {
  if (score >= 60) return "text-danger bg-danger/10";
  if (score >= 30) return "text-warning bg-warning/10";
  return "text-muted bg-border/50";
}
