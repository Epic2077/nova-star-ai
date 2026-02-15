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
