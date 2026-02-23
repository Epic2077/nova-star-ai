import { memo } from "react";
import type { Message } from "@/types/chat";
import UserBubble from "./ChatBubble";
import AssistantMessage from "./AssistantMessage";

function MessageItem({
  message,
  streaming,
  onEdit,
  onRegenerate,
  onAltPrev,
  onAltNext,
}: {
  message: Message;
  streaming?: boolean;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  onAltPrev?: () => void;
  onAltNext?: () => void;
}) {
  if (message.role === "user") {
    return (
      <UserBubble
        content={message.content}
        attachments={message.metadata?.attachments}
        onEdit={onEdit}
      />
    );
  }

  // Determine which content/metadata to show based on active alternative
  const altIndex = message.activeAltIndex ?? 0;
  const alts = message.alternatives ?? [];
  const totalAlts = alts.length + 1; // +1 for the original

  let displayContent = message.content;
  let displayMetadata = message.metadata;

  if (altIndex > 0 && alts[altIndex - 1]) {
    const alt = alts[altIndex - 1];
    displayContent = alt.content;
    displayMetadata = alt.metadata;
  }

  return (
    <AssistantMessage
      content={displayContent}
      thinking={displayMetadata?.thinking}
      toolResults={displayMetadata?.toolResults}
      codeResult={displayMetadata?.codeResult}
      streaming={streaming}
      altTotal={totalAlts}
      altCurrent={altIndex}
      onAltPrev={totalAlts > 1 ? onAltPrev : undefined}
      onAltNext={totalAlts > 1 ? onAltNext : undefined}
      onRegenerate={onRegenerate}
    />
  );
}

export default memo(MessageItem);
