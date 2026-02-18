import type { MessageRecord } from "./chat";

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
};
