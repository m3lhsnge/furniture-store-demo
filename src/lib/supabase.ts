import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

// No configuration means local demo mode. Never use secret/service-role keys here.
export const supabase = url && key ? createClient(url, key) : null
