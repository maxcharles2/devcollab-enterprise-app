import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client with service role key.
 * 
 * IMPORTANT: This client has full database access and bypasses Row Level Security.
 * Only use this in API routes (server-side code). Never import this in client components
 * or expose it to the browser.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
