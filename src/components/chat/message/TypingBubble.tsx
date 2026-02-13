export default function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted/80 text-muted-foreground px-4 py-2 rounded-2xl rounded-bl-sm shadow-sm inline-flex items-center gap-2">
        <span className="dot animate-pulse w-2 h-2 rounded-full bg-foreground/60 inline-block" />
        <span className="dot delay-75 animate-pulse w-2 h-2 rounded-full bg-foreground/60 inline-block" />
        <span className="dot delay-150 animate-pulse w-2 h-2 rounded-full bg-foreground/60 inline-block" />
      </div>
    </div>
  );
}
