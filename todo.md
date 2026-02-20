# Nova Star AI - Todo

## High Impact

- [x] Stop/cancel generation — AbortController + stop button in UI
- [ ] Image understanding — send uploaded images to vision model (GPT-4o)

## Medium Impact

- [x] Message editing & regeneration — edit previous messages, regenerate responses
- [x] Code execution tool — sandboxed interpreter for computational questions
- [x] Chat export (PDF / Markdown)

## Memory System

- [x] Memory extraction — two-tier trigger (immediate for important info, cadence for rest)
- [x] Memory conflict detection — contradictions lower old memory confidence
- [x] Deduplication — existing memories injected into extraction prompt
- [x] Confidence decay — old memories slowly lose confidence unless reinforced
- [x] Insight regeneration — periodic job to recompute insights from active memories
- [x] Memory prompt — AI instructed to actively use stored memories in conversation
- [ ] Configure CRON_SECRET env var and set up daily cron for `/api/cron/memory-maintenance`
- [ ] Memory dashboard for users — view/manage what Nova remembers about them

## Polish

- [x] Prompt caching — reduce cost/latency for repeated system prompts
- [x] Rate limiting & usage tracking — token usage per user, display in settings
- [ ] Voice input/output — Whisper STT, TTS for responses
