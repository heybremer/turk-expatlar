import axios, { AxiosError } from "axios";

export const API_URL = "https://api.turkexpatlar.de/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg[0];
    if (typeof msg === "string") return msg;
    return error.message;
  }
  return "Bir hata oluştu";
}

function getStatus(error: unknown): number {
  if (error instanceof AxiosError) return error.response?.status ?? 0;
  return 0;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await client.request<T>({ method, url: path, data: body, headers });
    return res.data;
  } catch (err) {
    throw new ApiError(getErrorMessage(err), getStatus(err));
  }
}

async function uploadRequest<T>(
  path: string,
  uri: string,
  mimeType: string,
  fileName: string,
  token?: string | null,
): Promise<T> {
  try {
    const formData = new FormData();
    formData.append("file", { uri, type: mimeType, name: fileName } as unknown as Blob);
    const headers: Record<string, string> = { "Content-Type": "multipart/form-data" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await client.post<T>(path, formData, { headers });
    return res.data;
  } catch (err) {
    throw new ApiError(getErrorMessage(err), getStatus(err));
  }
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>("GET", path, undefined, token),
  post: <T>(path: string, body: unknown, token?: string | null) => request<T>("POST", path, body, token),
  patch: <T>(path: string, body: unknown, token?: string | null) => request<T>("PATCH", path, body, token),
  delete: <T>(path: string, token?: string | null) => request<T>("DELETE", path, undefined, token),
  upload: <T>(path: string, uri: string, mimeType: string, fileName: string, token?: string | null) =>
    uploadRequest<T>(path, uri, mimeType, fileName, token),
};

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  profile?: {
    displayName: string;
    avatarUrl?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    postalCode?: string | null;
    postalCountry?: "DE" | "TR" | null;
    state?: { name: string; id: string } | null;
    city?: { name: string; id: string } | null;
    onboardingCompletedAt?: string | null;
    interests?: string[];
  } | null;
};

export type FederalState = {
  id: string;
  name: string;
  slug: string;
  cities: { id: string; name: string; slug: string }[];
};

export type ForumTopic = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  viewCount?: number;
  category: { id?: string; name: string; slug: string };
  city?: { name: string } | null;
  state?: { name: string } | null;
  user?: { id: string; role?: string; profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null } | null;
  _count?: { replies: number; interests?: number };
};

export type ForumReply = {
  id: string;
  body: string;
  isBest: boolean;
  createdAt: string;
  parentId?: string | null;
  voteCount?: number;
  userVoted?: boolean;
  children?: ForumReply[];
  user?: { id: string; role?: string; profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null } | null;
};

export type ForumTopicDetail = ForumTopic & {
  replies: ForumReply[];
  solvedReplyId?: string | null;
  userInterested?: boolean;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  priceType: string;
  priceAmount?: number | null;
  category?: string | null;
  status?: string;
  city: { name: string; id?: string };
  state: { name: string; id?: string };
  organizer?: { id: string; profile?: { displayName: string; avatarUrl?: string | null } | null } | null;
  _count?: { attendees: number };
};

export type Business = {
  id: string;
  name: string;
  description: string;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  speaksTurkish: boolean;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  category: { id?: string; name: string; slug: string };
  city: { name: string; id?: string };
  state?: { name: string; id?: string };
};

export type JobPosting = {
  id: string;
  listingType?: "EMPLOYER" | "SEEKER";
  company?: string | null;
  title: string;
  description: string;
  category: string;
  jobType: string;
  workMode: string;
  salaryRange?: string | null;
  turkishFriendly: boolean;
  germanLevel?: string | null;
  contactMethod?: "EMAIL" | "EXTERNAL_URL" | "PLATFORM" | string | null;
  contactValue?: string | null;
  status?: string;
  createdAt: string;
  city?: { name: string } | null;
  state?: { name: string } | null;
  owner?: { id: string; profile?: { displayName: string } | null } | null;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export type HomeFeed = {
  events: Event[];
  topics: ForumTopic[];
  businesses: Business[];
};

// ─── Chat Types (api/src/chat ile birebir eşleşir) ────────────────────────────

export type ChatUserRef = {
  id: string;
  role?: string;
  profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null;
};

export type ChatRoomsPublic = {
  global: { chatId: string; name: string };
  extraGlobals: { chatId: string; name: string }[];
  states: { id: string; name: string }[];
  cities: { id: string; name: string; stateId: string }[];
};

export type ChatResolve = { chatId: string; name: string };

export type ChatAttachment = {
  url: string;
  name: string;
  size: number;
  type: "image" | "file" | "audio";
  mime: string;
  /** Sunucudan gelmez; ses mesajı ekiyse istemcide gösterim için tahmini süre (sn). */
  durationSec?: number;
};

export type ChatReplyPreview = {
  id: string;
  body: string;
  deletedAt?: string | null;
  user: { profile?: { displayName: string } | null };
};

export type ChatMessage = {
  id: string;
  body: string;
  attachments?: ChatAttachment[] | null;
  expiresAt?: string | null;
  createdAt: string;
  reactions?: { emoji: string; count: number }[];
  replyTo?: ChatReplyPreview | null;
  user: ChatUserRef;
  /** Sadece mobil/web istemcisinde optimistik gönderim takibi için kullanılır, backend'den gelmez. */
  clientId?: string;
  pending?: boolean;
  failed?: boolean;
};

export type DmListEntry = {
  chatId: string;
  partner: ChatUserRef | null;
  lastMessage?: { body: string; createdAt: string } | null;
  unread: number;
};

export type DmResolveResult = {
  chatId: string;
  name: string;
  hasPassword?: boolean;
  partnerLastReadAt?: string | null;
  targetUser: ChatUserRef;
  muted?: boolean;
};

export type ChatAccessDenied = {
  reason: "no_location" | "wrong_location" | "blocked";
  requiredLocation?: string;
};

export type ChatOnlineUser = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  postalCountry?: "DE" | "TR" | null;
  socketId: string;
};

export type UserSearchResult = {
  id: string;
  profile?: {
    displayName: string;
    avatarUrl?: string | null;
    city?: { name: string } | null;
    state?: { name: string } | null;
  } | null;
};
