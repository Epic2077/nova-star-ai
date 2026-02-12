import type { Message } from "@/types/chat";
import UserBubble from "./ChatBubble";
import AssistantMessage from "./AssistantMessage";

function Message({ message }: { message: Message }) {
  if (message.role === "user") {
    return <UserBubble content={message.content} />;
  }

  return <AssistantMessage content={message.content} />;
}

export default Message;
