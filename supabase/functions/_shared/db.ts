import { createClient } from 'npm:@supabase/supabase-js@2'
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
export const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
export const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

export async function broadcast(coupleId: string) {
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ messages: [{ topic: `couple-${coupleId}`, event: 'changed', payload: {} }] }),
    })
  } catch { /* не критично */ }
}
