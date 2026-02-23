import type { MessageRecord } from "./chat";
import type { UserProfileRow } from "./userProfile";
import type { PartnerProfileRow } from "./partnerProfile";
import type { PartnershipRow } from "./partnership";
import type { SharedMemoryRow } from "./sharedMemory";
import type { SharedInsightRow } from "./sharedInsight";
import type { PersonalMemoryRow } from "./personalMemory";

export type AdminChat = {
  id: string;
  title: string;
  created_at: string;
  messages: MessageRecord[];
};

export type AdminResponse = {
  user: {
    id: string;
    email: string;
    role: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
    identities: unknown[];
    created_at: string;
    last_sign_in_at: string;
  };
  profile: Record<string, unknown> | null;
  chats: AdminChat[];
  /** Nova AI data — only present after the API extension */
  nova?: {
    userProfile: UserProfileRow | null;
    partnership: PartnershipRow | null;
    partnerProfile: PartnerProfileRow | null;
    partnerName: string | null;
    personalMemories: PersonalMemoryRow[];
    memories: SharedMemoryRow[];
    insights: SharedInsightRow[];
  };
  /** Token usage stats */
  usage?: {
    today: number;
    last7Days: number;
    last30Days: number;
    allTime: number;
    limit: number;
    byProvider: { provider: string; tokens: number }[];
    byEndpoint: { endpoint: string; tokens: number }[];
    dailyBreakdown: { date: string; tokens: number }[];
  };
};
