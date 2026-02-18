"use client";

import { FileIcon, X } from "lucide-react";
import type { FileAttachment } from "@/types/chat";

interface FilePreviewProps {
  attachments: FileAttachment[];
  /** Show remove button (for input preview, not message display) */
  removable?: boolean;
  onRemove?: (index: number) => void;
}

/**
 * Displays file attachment chips/thumbnails.
 * Used both in the chat input (with remove buttons) and in message bubbles.
 */
export default function FilePreview({
  attachments,
  removable = false,
  onRemove,
}: FilePreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((file, i) => {
        const isImage = file.mimeType?.startsWith("image/");

        return (
          <div
            key={`${file.name}-${i}`}
            className="relative group rounded-lg border border-border/50 bg-muted/30 overflow-hidden"
          >
            {isImage && file.url ? (
              <div className="w-20 h-20 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 max-w-48">
                <FileIcon
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">
                    {file.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
            )}

            {removable && onRemove && (
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                aria-label={`Remove ${file.name}`}
              >
                <X size={12} />
              </button>
            )}

            {isImage && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {file.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
