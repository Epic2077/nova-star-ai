import React from "react";
import type { FileAttachment } from "@/types/chat";

/**
 * Shared file-handling logic for chat inputs.
 * Supports:
 * - File picker (via ref)
 * - Paste (Ctrl+V / Cmd+V images)
 * - Drag & drop (anywhere on the page)
 * - Mobile camera capture (via separate input ref)
 */
export function useFileAttachments() {
  const [pendingFiles, setPendingFiles] = React.useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const dragCounterRef = React.useRef(0);

  /** Core: turn a FileList / File[] into FileAttachment entries */
  const addFiles = React.useCallback((files: FileList | File[]) => {
    setIsUploading(true);
    const newAttachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      const url = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      newAttachments.push({
        name: file.name,
        url,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        ...({ _file: file } as unknown as object),
      });
    }

    setPendingFiles((prev) => [...prev, ...newAttachments]);
    setIsUploading(false);
  }, []);

  /** <input type="file"> onChange */
  const handleFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      addFiles(files);
      // Reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    },
    [addFiles],
  );

  /** Remove a file by index, revoking blob URLs */
  const handleRemoveFile = React.useCallback((index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /** Paste handler — attach to the textarea's onPaste */
  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault(); // prevent the image from being pasted as text
        addFiles(imageFiles);
      }
    },
    [addFiles],
  );

  // ── Window-level drag & drop ────────────────────────────────
  // Uses a counter to handle nested dragenter/dragleave pairs.
  React.useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) {
        dragCounterRef.current += 1;
        if (dragCounterRef.current === 1) setIsDragOver(true);
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragOver(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        addFiles(files);
      }
    };

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);

    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  /** Clear all pending files (call on submit) */
  const clearFiles = React.useCallback(() => {
    setPendingFiles([]);
  }, []);

  /** Take all pending files and reset */
  const takeFiles = React.useCallback(() => {
    const files = [...pendingFiles];
    setPendingFiles([]);
    return files;
  }, [pendingFiles]);

  return {
    pendingFiles,
    isUploading,
    isDragOver,
    fileInputRef,
    cameraInputRef,
    handleFileSelect,
    handleRemoveFile,
    handlePaste,
    clearFiles,
    takeFiles,
    addFiles,
  };
}
