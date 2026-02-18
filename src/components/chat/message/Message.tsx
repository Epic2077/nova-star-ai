import { memo } from "react";
import type { Message } from "@/types/chat";
import UserBubble from "./ChatBubble";
import AssistantMessage from "./AssistantMessage";

function MessageItem({
  message,
  streaming,
}: {
  message: Message;
  streaming?: boolean;
}) {
  if (message.role === "user") {
    return (
      <UserBubble
        content={message.content}
        attachments={message.metadata?.attachments}
      />
    );
  }

  return (
    <AssistantMessage
      content={message.content}
      thinking={message.metadata?.thinking}
      toolResults={message.metadata?.toolResults}
      streaming={streaming}
    />
  );
}

export default memo(MessageItem);
