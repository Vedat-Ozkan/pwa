import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = !!(url && key)

// Create a real client if configured, otherwise a dummy that will error on use
export const supabase = isConfigured
  ? createClient(url, key)
  : createClient('https://placeholder.supabase.co', 'placeholder')
