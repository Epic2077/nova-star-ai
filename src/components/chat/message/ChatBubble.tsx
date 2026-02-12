function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%] bg-rose-200 text-neutral-900 px-4 py-3 rounded-2xl rounded-br-sm shadow-sm">
        {content}
      </div>
    </div>
  );
}

export default UserBubble;
