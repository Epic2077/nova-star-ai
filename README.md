<p align="center">
  <img src="public/logo/logo.png" alt="Nova Star AI" width="120" />
</p>

<h1 align="center">Nova Star AI</h1>

<p align="center">
  A relationship-aware conversational AI — built with care, powered by intelligence.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
</p>

---

## ✨ Overview

Nova Star is a personal AI assistant with emotional awareness, multi-model intelligence, and a layered prompt architecture. It goes beyond generic chatbots — it remembers context, reasons deeply, searches the web, executes code, and adapts its personality through configurable prompt layers and an AI-powered personality quiz.

---

## 🧠 AI Architecture

### Multi-Model Support

| Provider     | Models                               | Use Case                 |
| ------------ | ------------------------------------ | ------------------------ |
| **OpenAI**   | `gpt-4.1-mini`, `o4-mini`            | General chat & reasoning |
| **DeepSeek** | `deepseek-chat`, `deepseek-reasoner` | Chat & deep thinking     |

### Prompt Layer System

Nova's behavior is governed by a modular prompt architecture:

- **Core Layer** — Always active. Defines personality, emotional attunement, and response style.
- **Memory Layer** — Activated conditionally. Stores and applies context for continuity and personalization.
- **Insight Layer** — Activated on request. Provides respectful, relationship-protective observations.
- **Reference Layer** — Internal knowledge about key people for grounded, accurate responses.

Prompt layers are detected and activated dynamically via keyword analysis (`promptLayerDetection.ts`).

---

## 🚀 Features

### Chat & Streaming

- **Real-time SSE streaming** — All responses stream token-by-token via Server-Sent Events
- **Stop generation** — Cancel any in-flight response with a single click; partial text is preserved
- **Deep thinking mode** — Toggle reasoning models with an expandable "thinking" block UI
- **Web search** — Brave Search API integration with collapsible inline result blocks
- **Conversation memory** — Per-chat memory summaries generated every 20 messages
- **Auto-generated chat titles** — First message triggers AI-powered title generation

### Message Editing & Regeneration

- **Inline message editing** — Hover any user message to edit it in-place with Enter/Escape controls
- **Response regeneration** — Regenerate any assistant response with a single click
- **Answer carousel** — Browse between original and regenerated responses with `‹ 1/3 ›` pagination; all versions are preserved

### Code Execution

- **Browser-sandboxed execution** — JavaScript and Python code run entirely client-side in Web Workers, never touching the server
- **JavaScript sandbox** — Worker with all dangerous globals (`fetch`, `WebSocket`, `importScripts`, etc.) shadowed, 10s timeout
- **Python via Pyodide** — CPython compiled to WebAssembly, loaded from CDN (~11 MB, cached after first run), 30s timeout
- **Copy & Run buttons** — Every code block gets a copy button; JS and Python blocks also get a green Play button
- **Inline results** — Execution output, errors, and timing displayed directly below the code block
- **Collapsible execution block** — Full code execution results shown in a dedicated collapsible UI component

### Chat Export

- **Export as Markdown** — Download any conversation as a `.md` file
- **Export as PDF** — Opens a styled, printable HTML page that triggers the browser's print dialog

### File & Media

- **File uploads** — Images, PDFs, documents via Supabase Storage
- **Paste images** — Ctrl+V / Cmd+V to paste images directly
- **Drag & drop** — Drop files anywhere on the page with a full-screen overlay
- **Mobile camera** — Capture photos directly on mobile devices

### Personality Quiz & Onboarding

- **8-question personality quiz** — Open-ended questions about communication style, conflict resolution, love languages, and values
- **AI-generated profile** — Quiz answers processed by DeepSeek to create a structured personality profile
- **Onboarding modal** — First-login flow checks setup status and guides users through the quiz or skip
- **Partner connection** — Post-quiz popup to link partner accounts via invite codes
- **Nova Profile dashboard** — 4-tab dashboard: AI Profile, Partner Profile, Shared Memories, Shared Insights

### Partnership System

- **Partner linking** — Create or join partnerships via invite codes
- **Shared memories** — Cross-partner memory context for relationship-aware responses
- **Shared insights** — AI-generated relationship observations visible to both partners
- **Partnership management** — Dissolve partnerships with full cleanup

### UI & UX

- **Smart auto-scroll** — Follows streaming output, respects manual scroll-up
- **Typing indicator** — Animated typing bubble while awaiting assistant response
- **Rich Markdown rendering** — LaTeX (KaTeX), code syntax highlighting, GFM tables, footnotes, emoji, definition lists, superscript/subscript, abbreviations, keyboard shortcuts (`<kbd>`), and more
- **Dark/Light themes** — System-aware theming with `next-themes`
- **Responsive sidebar** — Collapsible chat history with search, rename, and delete via context menu
- **Realtime sidebar updates** — Supabase Realtime subscriptions for instant chat list sync
- **RTL support** — Automatic right-to-left detection for Persian/Arabic text with Vazirmatn font
- **Toast notifications** — Global feedback system via Sonner

### Landing Page

- **Hero section** — Animated logo, gradient title, tagline, theme toggle, CTA buttons
- **Daily quote** — Rotating daily relationship quote
- **Feature grid** — 6-card showcase (Relationship-Aware, Structured Memory, Private & Ethical, Personality Profiling, Partner Connection, Deep Thinking)
- **Capabilities section** — 4 capability cards (Smart Conversations, Cross-Chat Memory, Web Search, AI Personality Quiz)
- **Philosophy section** — "Built for Growth, Not Dependency" with three guiding principles
- **CTA section** — Gradient-bordered call-to-action
- **Framer Motion animations** — Smooth transitions throughout all sections

### Auth & Settings

- **Supabase Auth** — Email/password authentication with protected routes
- **Account settings** — Profile (name, bio, avatar upload), Appearance (theme), Security (password change, sign out), Partnership
- **Creator admin panel** — Manage chats and users
- **Middleware-guarded routes** — Role-based access control
- **Animated auth pages** — Login and signup forms with motion bubble backgrounds
- **Zod validation** — Schema-based form validation

---

## 🛠️ Tech Stack

| Layer           | Technology                                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| **Framework**   | Next.js 16 (App Router)                                                             |
| **Language**    | TypeScript (strict)                                                                 |
| **UI**          | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide Icons                                   |
| **Animation**   | Framer Motion                                                                       |
| **Backend**     | Supabase (Auth, PostgreSQL, Realtime, Storage)                                      |
| **AI**          | OpenAI API, DeepSeek API                                                            |
| **Search**      | Brave Search API                                                                    |
| **Code Runner** | Web Workers (JS sandbox + Pyodide/Python WASM)                                      |
| **Markdown**    | react-markdown, remark-gfm, rehype-katex, rehype-sanitize, react-syntax-highlighter |
| **Validation**  | Zod                                                                                 |
| **Monitoring**  | Vercel Speed Insights                                                               |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── chat/           # SSE streaming, file upload, messages, execute, export, title
│   │   ├── partnership/    # Partner linking, invite codes
│   │   └── quiz/           # Personality quiz processing
│   ├── chat/[dataId]/      # Dynamic chat pages
│   ├── quiz/               # Personality quiz page
│   ├── creator/            # Admin panel
│   ├── login/ & signup/    # Auth pages
│   └── setting/            # User settings (account, profile, appearance, security)
├── components/
│   ├── chat/               # ChatBody, ChatInput, Header
│   │   ├── hooks/          # useAutoScroll, useMessages, useChatSubmit, useFileAttachments
│   │   └── message/        # MessageItem, AssistantMessage, AnswerCarousel, CodeExecutionBlock,
│   │                       # ThinkingBlock, WebSearchBlock, TypingBubble, FilePreview
│   ├── ui/                 # shadcn/ui components
│   ├── landing/            # Hero, Feature, Capabilities, Philosophy, DailyQuote, CTA
│   ├── quiz/               # PersonalityQuiz, OnboardingQuizModal, PartnerConnectPopup
│   ├── account/            # Profile, Appearance, Security, Partnership sections
│   ├── profile/            # Nova Profile dashboard (AI, Partner, Memories, Insights tabs)
│   ├── markdown/           # Rich Markdown renderer with copy/run code block actions
│   └── login/              # LoginForm, SignUpForm, Bubblebg
├── lib/
│   ├── ai/provider.ts      # Unified AI provider (OpenAI + DeepSeek)
│   ├── codeExecutor.ts     # Client-side sandboxed code execution via Web Workers
│   ├── prompts/            # Layered prompt system (Core, Memory, Insight, Reference)
│   ├── promptLayerDetection.ts
│   └── supabase/           # Supabase client & server helpers
├── hooks/                  # useUser, useProfile, useMobile
├── types/                  # TypeScript type definitions
├── validation/             # Zod schemas
public/
└── workers/                # Web Worker scripts (js-sandbox.js, py-sandbox.js)
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or pnpm/yarn
- A **Supabase** project
- API keys for **OpenAI**, **DeepSeek**, and **Brave Search**

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Providers
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key

# Web Search
BRAVE_SEARCH_API_KEY=your_brave_search_key
```

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build for Production

```bash
npm run build
npm start
```

---

## 📄 License

This is a private project. All rights reserved.
