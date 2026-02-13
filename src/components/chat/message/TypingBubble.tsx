export default function TypingBubble() {
  return (
    <div className="flex justify-start mb-8 animate-fadeInUp">
      <div
        className="px-5 py-3 rounded-[22px] rounded-bl-xl inline-flex items-center gap-2 bg-transparent text-muted-foreground border-none"
      >
        <span className="typing-dot" />
        <span className="typing-dot delay-150" />
        <span className="typing-dot delay-300" />
        <span className="text-sm opacity-60 ml-2">thinking…</span>
      </div>
    </div>
  );
}
