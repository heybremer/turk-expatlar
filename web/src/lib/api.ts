const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { next?: NextFetchRequestConfig } = {},
  token?: string | null,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const { next, ...fetchOptions } = options;

  const res = await fetch(`${API_URL}/api${path}`, {
    ...fetchOptions,
    headers,
    // next.revalidate geçilmişse ISR cache, yoksa no-store
    ...(next ? { next } : { cache: "no-store" }),
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      (body as { message?: string | string[] }).message?.toString() ??
        "Bir hata oluştu",
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

async function uploadRequest<T>(
  path: string,
  file: File,
  token?: string | null,
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/api${path}`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      (body as { message?: string | string[] }).message?.toString() ??
        "Dosya yüklenemedi",
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string | null, revalidate?: number) =>
    request<T>(path, { method: "GET", ...(revalidate !== undefined ? { next: { revalidate } } : {}) }, token),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, token),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token),
  delete: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: "DELETE" }, token),
  upload: <T>(path: string, file: File, token?: string | null) =>
    uploadRequest<T>(path, file, token),
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
  _optimistic?: boolean;
  children?: ForumReply[];
  user?: { id: string; role?: string; profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null } | null;
};

export type ForumPoll = {
  id: string;
  question: string;
  totalVotes: number;
  endsAt?: string | null;
  userVotedOptionId?: string | null;
  options: {
    id: string;
    text: string;
    voteCount: number;
    percent: number;
    userVoted: boolean;
  }[];
};

export type ForumTopicDetail = ForumTopic & {
  replies: ForumReply[];
  solvedReplyId?: string | null;
  userInterested?: boolean;
  poll?: ForumPoll | null;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  priceType: string;
  priceAmount?: number | null;
  category?: string | null;
  status?: string;
  city: { name: string; id?: string };
  state: { name: string; id?: string };
  organizer?: {
    id: string;
    profile?: { displayName: string; avatarUrl?: string | null; trustScore?: number; postalCountry?: "DE" | "TR" | null } | null;
  } | null;
  attendees?: { user: { id: string; profile?: { displayName: string; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null } }[];
  _count?: { attendees: number };
};

export type Business = {
  id: string;
  name: string;
  description: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  languages?: string[];
  speaksTurkish: boolean;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  category: { id?: string; name: string; slug: string };
  city: { name: string; id?: string };
  state?: { name: string; id?: string };
  reviews?: BusinessReview[];
};

export type BusinessReview = {
  id: string;
  rating: number;
  comment?: string | null;
  status?: string;
  editCount?: number;
  createdAt: string;
  user?: { profile?: { displayName: string; avatarUrl?: string | null } | null } | null;
};

export type SearchResults = {
  topics: ForumTopic[];
  events: Event[];
  businesses: Business[];
};

export type JobPosting = {
  id: string;
  listingType?: "EMPLOYER" | "SEEKER";
  company?: string | null;
  title: string;
  description: string;
  briefInfo?: string | null;
  cvUrl?: string | null;
  cvFileName?: string | null;
  category: string;
  jobType: "FULL_TIME" | "PART_TIME" | "MINIJOB" | "AUSBILDUNG" | "INTERNSHIP" | "FREELANCE";
  workMode: "ONSITE" | "REMOTE" | "HYBRID";
  salaryRange?: string | null;
  turkishFriendly: boolean;
  germanLevel?: string | null;
  contactMethod: "PLATFORM" | "EMAIL" | "EXTERNAL_URL";
  contactValue?: string | null;
  status?: string;
  viewCount?: number;
  createdAt: string;
  city?: { name: string } | null;
  state?: { name: string } | null;
  owner?: {
    id: string;
    profile?: { displayName: string; trustScore?: number } | null;
  } | null;
};

export type CourierRequest = {
  id: string;
  direction: "DE_TO_TR" | "TR_TO_DE";
  fromArea: string;
  toArea: string;
  itemName: string;
  itemCategory: string;
  weightKg?: number | null;
  estimatedValueEur?: number | null;
  paymentType: "FREE" | "PAID" | "NEGOTIABLE";
  paymentAmount?: number | null;
  notes?: string | null;
  preferredDate?: string | null;
  status: "OPEN" | "MATCHED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  confirmedAcceptanceId?: string | null;
  createdAt: string;
  owner?: {
    id: string;
    profile?: { displayName: string; trustScore?: number; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null;
  } | null;
  _count?: { acceptances: number };
  acceptanceCount?: number;
  isOwner?: boolean;
  myAcceptance?: CourierAcceptance | null;
  acceptances?: CourierAcceptance[];
  confirmed?: CourierAcceptance | null;
};

export type CourierAcceptance = {
  id: string;
  message?: string | null;
  travelDate?: string | null;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  traveler?: {
    id: string;
    profile?: { displayName: string; trustScore?: number; avatarUrl?: string | null; postalCountry?: "DE" | "TR" | null } | null;
  } | null;
};

type TravelerProfile = {
  id: string;
  profile?: { displayName: string; avatarUrl?: string | null; trustScore?: number; postalCountry?: "DE" | "TR" | null } | null;
};

export type TravelAnnouncement = {
  id: string;
  direction: "DE_TO_TR" | "TR_TO_DE";
  fromCity: string;
  toCity: string;
  departureDate: string;
  availableKg?: number | null;
  notes?: string | null;
  status: "OPEN" | "CLOSED" | "EXPIRED";
  createdAt: string;
  user?: TravelerProfile | null;
  requestCount?: number;
  isOwner?: boolean;
  myRequest?: TravelRequest | null;
  requests?: TravelRequest[];
  _count?: { requests: number };
};

export type TravelRequest = {
  id: string;
  itemName: string;
  description?: string | null;
  weightKg?: number | null;
  paymentType: "FREE" | "PAID" | "NEGOTIABLE";
  paymentAmount?: number | null;
  notes?: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  requester?: TravelerProfile | null;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationList = {
  items: Notification[];
  unreadCount: number;
};

export type CityDetail = {
  city: { id: string; name: string; slug: string; state: { name: string; slug: string } };
  events: Event[];
  topics: ForumTopic[];
  businesses: Business[];
  stats: { topicCount: number; businessCount: number };
};

export type HomeFeed = {
  events: Event[];
  topics: ForumTopic[];
  businesses: Business[];
  guide: { title: string; slug: string }[];
};

export type MembershipPlan = "USER_YEARLY" | "BUSINESS_YEARLY" | "FREE_PROMO";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING_PAYMENT";

export type Subscription = {
  id: string;
  plan: MembershipPlan;
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt?: string | null;
  promoCode?: { code: string; label: string } | null;
};

export type MySubscription = {
  subscription: Subscription | null;
  plan: MembershipPlan | null;
  status: SubscriptionStatus | null;
  isActive: boolean;
};

export type LaunchPromoStats = {
  code: string;
  maxUses: number;
  usedCount: number;
  remaining: number;
  active: boolean;
  available: boolean;
};
