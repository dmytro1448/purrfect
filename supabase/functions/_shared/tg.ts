export const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? ''
export const APP_URL = Deno.env.get('APP_URL') ?? ''
export const BOT_USERNAME = Deno.env.get('BOT_USERNAME') ?? ''

const enc = new TextEncoder()
async function hmac(key: Uint8Array<ArrayBuffer>, msg: string) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array<ArrayBuffer>(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string }

/** Перевіряє підпис Telegram initData. Повертає користувача або null. */
export async function verifyInitData(initData: string, maxAgeSec = 60 * 60 * 24 * 30): Promise<{ user: TgUser; start_param?: string } | null> {
  if (!initData || !BOT_TOKEN) return null
  const p = new URLSearchParams(initData)
  const hash = p.get('hash')
  if (!hash) return null
  p.delete('hash')
  const dcs = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = await hmac(enc.encode('WebAppData'), BOT_TOKEN)
  const calc = hex(await hmac(secret, dcs))
  if (calc !== hash) return null
  const authDate = Number(p.get('auth_date') || 0)
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null
  try {
    return { user: JSON.parse(p.get('user') || 'null'), start_param: p.get('start_param') ?? undefined }
  } catch { return null }
}

export async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return await r.json()
}

export function openAppMarkup(text = 'Відкрити Purrfect 🐾', query = '') {
  return { inline_keyboard: [[{ text, web_app: { url: APP_URL + query } }]] }
}

export async function sendTo(chatId: number | string, text: string, withButton = true) {
  return await tg('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    ...(withButton ? { reply_markup: openAppMarkup() } : {}),
  })
}

export const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
