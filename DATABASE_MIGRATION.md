# Database Migration - Memory System

## Required Schema Changes

To enable the memory system, you need to add two new columns to the `chats` table in Supabase.

### SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add memory_summary column to store conversation summaries
ALTER TABLE chats
ADD COLUMN memory_summary TEXT,
ADD COLUMN memory_updated_at TIMESTAMP WITH TIME ZONE;

-- Create an index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_chats_memory_updated
ON chats(memory_updated_at);
```

### Column Details

- **`memory_summary`** (TEXT, nullable)
  - Stores cumulative summaries of conversations
  - Generated every 20 messages
  - Each segment is appended with a separator (`---`)
  - Used when `useMemoryLayer=true` in the chat API

- **`memory_updated_at`** (TIMESTAMP WITH TIME ZONE, nullable)
  - Tracks when the memory was last updated
  - Updated every 20 messages when a new summary is generated

### How It Works

1. After every 20 messages (20, 40, 60, etc.), the system:
   - Fetches the last 20 messages
   - Generates an AI summary focusing on:
     - Key topics
     - Emotional patterns
     - Important information (preferences, dates, names)
     - Relationship dynamics
   - Appends the summary to `memory_summary` with a segment label
   - Updates `memory_updated_at` timestamp

2. When `useMemoryLayer=true` in the API request:
   - The system includes the `memory_summary` in the system prompt
   - This provides continuity across long conversations without sending all history

### Benefits

- **Token Efficiency**: Summarizes old messages instead of sending full history
- **Long-term Memory**: Preserves important context across hundreds of messages
- **Automatic**: Runs in the background every 20 messages
- **Non-blocking**: Summary generation doesn't fail the main request

---

## AI Tools - Message Types, Metadata & File Storage

### SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add type column with check constraint (if not already done)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

ALTER TABLE messages
ADD CONSTRAINT messages_type_check
CHECK (type IN ('text', 'image', 'file', 'tool'));

-- Add metadata JSONB column for storing thinking content, tool results, and file attachments
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for filtering by message type (optional)
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
```

### Supabase Storage Bucket

Create a public storage bucket for file uploads:

1. Go to **Supabase Dashboard > Storage**
2. Click **New Bucket**
3. Name: `chat-attachments`
4. Public: **Yes** (so files can be accessed via URL)
5. File size limit: **10MB**
6. Allowed MIME types: `image/*, application/pdf, text/*, application/json, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Or via SQL:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', true, 10485760);
```

### Environment Variables

Add these to your `.env.local`:

```env
# Web Search (Brave Search API - get free key at https://brave.com/search/api/)
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
```

### Column Details

- **`type`** (TEXT, default 'text')
  - `text` — regular text message
  - `image` — message with image attachment(s)
  - `file` — message with file attachment(s)
  - `tool` — message generated using a tool (web search, etc.)

- **`metadata`** (JSONB, nullable)
  - Stores structured data for advanced features:
    - `thinking` (string) — chain-of-thought reasoning from deep thinking
    - `toolResults` (array) — web search results and other tool outputs
    - `attachments` (array) — file attachment details (name, url, mimeType, size)
