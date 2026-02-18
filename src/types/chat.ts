export type MessageRole = "user" | "assistant";

export type MessageType = "text" | "image" | "file" | "tool";

/* ------------------------------------------------------------------ */
/*  Tool / feature metadata sub-types                                  */
/* ------------------------------------------------------------------ */

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type ToolResult = {
  tool: "web_search";
  query: string;
  results: WebSearchResult[];
};

export type FileAttachment = {
  name: string;
  url: string;
  mimeType: string;
  size: number;
};

export type MessageMetadata = {
  thinking?: string;
  toolResults?: ToolResult[];
  attachments?: FileAttachment[];
};

/* ------------------------------------------------------------------ */
/*  Core message types                                                 */
/* ------------------------------------------------------------------ */

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  type?: MessageType;
  metadata?: MessageMetadata;
};

export type MessageRecord = {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  type?: MessageType;
  metadata?: MessageMetadata | null;
  created_at: string;
};

export type NewMessagePayload = {
  chat_id: string;
  role: MessageRole;
  content: string;
  type?: MessageType;
  metadata?: MessageMetadata;
};

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  memory_summary?: string | null;
  memory_updated_at?: string | null;
};
