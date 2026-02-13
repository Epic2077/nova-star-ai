import { memo } from "react";
import type { Message } from "@/types/chat";
import UserBubble from "./ChatBubble";
import AssistantMessage from "./AssistantMessage";

function Message({
  message,
  animate,
}: {
  message: Message;
  animate?: boolean;
}) {
  if (message.role === "user") {
    return <UserBubble content={message.content} />;
  }

  return <AssistantMessage content={message.content} animate={animate} />;
}

export default memo(Message);
