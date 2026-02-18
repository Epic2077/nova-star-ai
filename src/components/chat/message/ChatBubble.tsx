import isRTL from "@/lib/rtlDetect";
import type { FileAttachment } from "@/types/chat";
import FilePreview from "./FilePreview";

function UserBubble({
  content,
  attachments,
}: {
  content: string;
  attachments?: FileAttachment[];
}) {
  const rtl = isRTL(content);
  return (
    <div className="flex justify-end">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="mb-10 max-w-[70%] bg-chat-bubble text-neutral-900 px-4 py-3 rounded-2xl rounded-br-sm shadow-sm whitespace-pre-wrap"
      >
        {attachments && attachments.length > 0 && (
          <div className="mb-2">
            <FilePreview attachments={attachments} />
          </div>
        )}
        {content}
      </div>
    </div>
  );
}

export default UserBubble;
