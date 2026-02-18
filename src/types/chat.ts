export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
};

export type MessageRecord = {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type NewMessagePayload = {
  chat_id: string;
  role: MessageRole;
  content: string;
};

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  memory_summary?: string | null;
  memory_updated_at?: string | null;
};
