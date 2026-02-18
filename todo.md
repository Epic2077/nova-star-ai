# Nova Star AI - Todo

## High Impact

- [ ] Cross-chat memory (global user profile) — persist key facts across all conversations
- [ ] Memory between two users connected via a shared code.
- [ ] memory_snapshots Table Instead of overwriting memory each time, keep history.
- Do NOT update memory every message.

         Instead:
         Flow:
         User chats normally
         After X messages (or when conversation ends)
         You send conversation to AI:
         "Extract persistent traits, tone patterns, emotional needs, and long-term facts. Summarize."
         AI returns structured memory
         You update user_memory.summary
         the structure should look like this:
         {
            "tone": "direct but emotionally supportive",
            "attachment_style": "anxious",
            "conflict_pattern": "withdraws under pressure",
            "needs": ["reassurance", "clarity"],
            "values": ["honesty", "loyalty"]
         }

- [ ] Stop/cancel generation — AbortController + stop button in UI
- [ ] Image understanding — send uploaded images to vision model (GPT-4o)

## Medium Impact

- [ ] Message editing & regeneration — edit previous messages, regenerate responses
- [ ] Code execution tool — sandboxed interpreter for computational questions
- [ ] Chat export (PDF / Markdown)

## Polish

- [ ] Prompt caching — reduce cost/latency for repeated system prompts
- [ ] Rate limiting & usage tracking — token usage per user, display in settings
- [ ] Voice input/output — Whisper STT, TTS for responses
