import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use ANON key for client-side

// This client should only be used for database operations, not auth
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
}) 