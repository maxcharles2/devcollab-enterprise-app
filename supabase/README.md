# Supabase migrations

## Applying the schema

### Option A: Supabase CLI (recommended)

1. Link your project (one-time):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Get your project ref from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → General.

2. Push migrations:
   ```bash
   supabase db push
   ```

### Option B: SQL Editor

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Copy the contents of `migrations/20250209120000_initial_clerk_supabase_schema.sql`.
3. Paste and run the script.

This creates the tables (profiles, channels, chats, messages, etc.) and enables Row Level Security with the basic read policies from the plan.
