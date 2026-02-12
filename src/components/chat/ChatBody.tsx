"use client";

import React, { useState } from "react";
import ChatInput from "./ChatInput";
import { Message } from "@/types/chat";

const ChatBody = () => {
  const [message] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  return (
    <div className="sticky bottom-0 pb-5">
      <ChatInput input={input} setInput={setInput} message={message} />
    </div>
  );
};

export default ChatBody;
