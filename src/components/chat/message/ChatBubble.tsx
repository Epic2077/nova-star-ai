import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import isRTL from "@/lib/rtlDetect";
import type { FileAttachment } from "@/types/chat";
import FilePreview from "./FilePreview";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function UserBubble({
  content,
  attachments,
  onEdit,
}: {
  content: string;
  attachments?: FileAttachment[];
  onEdit?: (newContent: string) => void;
}) {
  const rtl = isRTL(content);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === content) {
      setEditValue(content);
      setIsEditing(false);
      return;
    }
    onEdit?.(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(content);
    setIsEditing(false);
  };

  return (
    <div className="flex justify-end group">
      <div className="flex items-start gap-1.5 max-w-[70%]">
        {/* Edit button (visible on hover) */}
        {onEdit && !isEditing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity mt-2 shrink-0"
                onClick={() => {
                  setEditValue(content);
                  setIsEditing(true);
                }}
                aria-label="Edit message"
              >
                <Pencil size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit message</TooltipContent>
          </Tooltip>
        )}

        <div
          dir={rtl ? "rtl" : "ltr"}
          className="mb-10 bg-chat-bubble text-neutral-900 px-4 py-3 rounded-2xl rounded-br-sm shadow-sm whitespace-pre-wrap"
        >
          {attachments && attachments.length > 0 && (
            <div className="mb-2">
              <FilePreview attachments={attachments} />
            </div>
          )}

          {isEditing ? (
            <div>
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSave();
                  }
                  if (e.key === "Escape") handleCancel();
                }}
                className="w-full min-h-8 resize-none bg-transparent outline-none text-base"
                rows={1}
              />
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleCancel}
                  aria-label="Cancel editing"
                >
                  <X size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleSave}
                  aria-label="Save edit"
                >
                  <Check size={14} />
                </Button>
              </div>
            </div>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}

export default UserBubble;
