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

Nova Star is a personal AI assistant with emotional awareness, multi-model intelligence, and a layered prompt architecture. It goes beyond generic chatbots — it remembers context, reasons deeply, searches the web, and adapts its personality through configurable prompt layers.

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
- **Deep thinking mode** — Toggle reasoning models with an expandable "thinking" block UI
- **Web search** — Brave Search API integration for real-time information retrieval
- **Conversation memory** — Per-chat memory summaries generated every 20 messages

### File & Media

- **File uploads** — Images, PDFs, documents via Supabase Storage
- **Paste images** — Ctrl+V / Cmd+V to paste images directly
- **Drag & drop** — Drop files anywhere on the page with a full-screen overlay
- **Mobile camera** — Capture photos directly on mobile devices

### UI & UX

- **Smart auto-scroll** — Follows streaming output, respects manual scroll-up
- **Rich Markdown rendering** — LaTeX (KaTeX), Mermaid diagrams, code syntax highlighting, GFM tables, footnotes, emoji, and more
- **Dark/Light themes** — System-aware theming with `next-themes`
- **Responsive sidebar** — Collapsible chat history with search
- **RTL support** — Automatic right-to-left detection for Persian/Arabic text

### Auth & Admin

- **Supabase Auth** — Email/password authentication with protected routes
- **Creator admin panel** — Manage chats and users
- **Middleware-guarded routes** — Role-based access control

---

## 🛠️ Tech Stack

| Layer          | Technology                                                          |
| -------------- | ------------------------------------------------------------------- |
| **Framework**  | Next.js 16 (App Router)                                             |
| **Language**   | TypeScript (strict)                                                 |
| **UI**         | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide Icons                   |
| **Animation**  | Framer Motion                                                       |
| **Backend**    | Supabase (Auth, PostgreSQL, Realtime, Storage)                      |
| **AI**         | OpenAI API, DeepSeek API                                            |
| **Search**     | Brave Search API                                                    |
| **Markdown**   | react-markdown, remark-gfm, rehype-katex, rehype-highlight, mermaid |
| **Validation** | Zod                                                                 |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/chat/           # SSE streaming endpoint, file upload
│   ├── chat/[dataId]/      # Dynamic chat pages
│   ├── creator/            # Admin panel
│   ├── login/ & signup/    # Auth pages
│   └── setting/            # User settings
├── components/
│   ├── chat/               # ChatBody, ChatInput, NewChatInput
│   │   ├── hooks/          # useAutoScroll, useMessages, useChatSubmit, useFileAttachments
│   │   └── message/        # MessageItem, AssistantMessage, ThinkingBlock, FilePreview
│   ├── ui/                 # shadcn/ui components
│   ├── landing/            # Landing page sections
│   └── markdown/           # Rich Markdown renderer
├── lib/
│   ├── ai/provider.ts      # Unified AI provider (OpenAI + DeepSeek)
│   ├── prompts/            # Layered prompt system (Core, Memory, Insight, Reference)
│   ├── promptLayerDetection.ts
│   └── supabase/           # Supabase client & server helpers
├── hooks/                  # useUser, useProfile, useMobile
├── types/                  # TypeScript type definitions
└── validation/             # Zod schemas
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** (recommended) or npm/yarn
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
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build for Production

```bash
pnpm build
pnpm start
```

---

## 📄 License

This is a private project. All rights reserved.
