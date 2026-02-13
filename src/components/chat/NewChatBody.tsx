"use client";

import { useState } from "react";

import { useUser } from "@/hooks/useUser";
import NewChatInput from "./NewChatInput";

const NewChatBody = () => {
  const { user } = useUser();

  const [input, setInput] = useState("");

  return (
    <section className="bg-chat-background h-[calc(100vh-65px)] overflow-hidden">
      <NewChatInput userInfo={user} input={input} setInput={setInput} />
    </section>
  );
};

export default NewChatBody;
