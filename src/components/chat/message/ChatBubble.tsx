function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="mb-10 max-w-[70%] bg-chat-bubble text-neutral-900 px-4 py-3 rounded-2xl rounded-br-sm shadow-sm">
        {content}
      </div>
    </div>
  );
}

export default UserBubble;
