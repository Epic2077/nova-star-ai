export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
};
