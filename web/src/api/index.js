// Єдина точка доступу до бекенду. Див. CONTRACT.md
import { mockCall } from './mock.js'

const API_URL = import.meta.env.VITE_API_URL || ''
const forceMock = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mock')
export const isMock = !API_URL || forceMock

function initData() {
  return window.Telegram?.WebApp?.initData || ''
}

async function realCall(method, params = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Init-Data': initData() },
    body: JSON.stringify({ method, params }),
  })
  let json
  try { json = await res.json() } catch { throw new Error('network') }
  if (!json.ok) throw new Error(json.error || 'error')
  return json.data
}

export const api = {
  call: (method, params) => (isMock ? mockCall(method, params) : realCall(method, params)),
}

// Завантаження фото: повертає публічний URL
export async function uploadImage(file) {
  const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  if (isMock) {
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file) })
  }
  const blob = await compressImage(file)
  const { upload_url, public_url } = await api.call('upload.sign', { ext: 'jpg' })
  const put = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob })
  if (!put.ok) throw new Error('upload_failed')
  return public_url
}

async function compressImage(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85))
  } catch { return file }
}

// Realtime-сигнал «щось змінилось» між партнерами (Supabase broadcast, без даних)
export async function subscribeCouple(coupleId, onChange) {
  const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (isMock || !url || !key || !coupleId) return () => {}
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(url, key)
  const ch = sb.channel('couple-' + coupleId).on('broadcast', { event: 'changed' }, () => onChange()).subscribe()
  return () => sb.removeChannel(ch)
}
