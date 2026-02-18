"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MessageItem from "@/components/chat/message/Message";
import type { Message } from "@/types/chat";
import type { AdminChat } from "@/types/admin";
import { useCreatorAdmin } from "@/components/creator/CreatorAdminContext";
import { formatTimestamp } from "@/lib/formatTimestamp";

export default function CreatorChatsPage() {
  const { result } = useCreatorAdmin();
  const [selectedChatId, setSelectedChatId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!result) {
      setSelectedChatId(null);
      return;
    }

    if (
      selectedChatId &&
      result.chats.some((chat) => chat.id === selectedChatId)
    ) {
      return;
    }

    setSelectedChatId(result.chats[0]?.id ?? null);
  }, [result, selectedChatId]);

  const selectedChat: AdminChat | null =
    result?.chats.find((chat) => chat.id === selectedChatId) ?? null;

  const mappedMessages: Message[] = (selectedChat?.messages ?? []).map(
    (message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    }),
  );

  return (
    <div className="space-y-6">
      {result ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Chats ({result.chats.length})</CardTitle>
              <CardDescription>
                Click a chat row to view its messages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.chats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        No chats found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.chats.map((chat) => {
                      const isSelected = selectedChatId === chat.id;
                      return (
                        <TableRow
                          key={chat.id}
                          data-state={isSelected ? "selected" : undefined}
                          className="cursor-pointer"
                          onClick={() => setSelectedChatId(chat.id)}
                        >
                          <TableCell className="font-medium">
                            {chat.title || "Untitled Chat"}
                          </TableCell>
                          <TableCell>
                            {formatTimestamp(chat.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            {chat.messages.length}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedChat
                  ? selectedChat.title || "Untitled Chat"
                  : "Select a chat"}
              </CardTitle>
              <CardDescription>
                {selectedChat
                  ? `${selectedChat.id} · ${selectedChat.created_at}`
                  : "No chat selected"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[70vh] overflow-auto space-y-4 pr-2">
                {!selectedChat ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a chat from the table.
                  </p>
                ) : mappedMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages in this chat.
                  </p>
                ) : (
                  mappedMessages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      animate={false}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Search for a user email above to inspect chats and open messages.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
