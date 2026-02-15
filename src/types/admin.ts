export type AdminMessage = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type AdminChat = {
  id: string;
  title: string;
  created_at: string;
  messages: AdminMessage[];
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
