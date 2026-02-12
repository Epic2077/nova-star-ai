"use client";

import { useState } from "react";
import { Message } from "@/types/chat";

import { useUser } from "@/hooks/useUser";
import ChatInput from "./ChatInput";

const ChatBody = () => {
  const { user } = useUser();

  const [message] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  return (
    <section>
      <ChatInput
        user={user}
        input={input}
        setInput={setInput}
        message={message}
      />
    </section>
  );
};

export default ChatBody;
