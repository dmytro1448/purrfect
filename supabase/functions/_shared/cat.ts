import { db } from './db.ts'
import { localParts, addDays } from './time.ts'

const TITLES: [number, string][] = [[1, 'Кошеня'], [2, 'Муркотик'], [3, 'Пухнастик'], [4, 'Хазяїн дивану'], [5, 'Королівський кіт'], [7, 'Легенда муркотіння']]
export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 20)) + 1
export const xpForLevel = (l: number) => 20 * (l - 1) ** 2
const titleFor = (l: number) => TITLES.filter(([n]) => l >= n).pop()![1]

export type CatRaw = { name?: string; xp?: number; hunger?: number; mood?: number; at?: string; last_fed_at?: string; last_pet_at?: string; accessory?: string }

/** Застосовує природне падіння голоду/настрою з моменту `at` */
export function decay(c: CatRaw, now = Date.now()): CatRaw {
  const at = c.at ? Date.parse(c.at) : now
  const h = Math.max(0, (now - at) / 3600000)
  return { ...c, hunger: Math.max(0, (c.hunger ?? 80) - 4 * h), mood: Math.max(0, (c.mood ?? 80) - 2 * h), at: new Date(now).toISOString() }
}

export function streakOf(days: string[], tz: string) {
  const set = new Set(days)
  let d = localParts(tz).date
  if (!set.has(d)) d = addDays(d, -1)
  let n = 0
  while (set.has(d)) { n++; d = addDays(d, -1) }
  return n
}

export function catView(couple: { cat: CatRaw; activity_days: string[]; tz: string }) {
  const c = decay(couple.cat || {})
  const xp = c.xp ?? 0
  const level = levelFromXp(xp)
  return {
    name: c.name || 'Мурчик', xp, level, level_title: titleFor(level),
    level_xp: xpForLevel(level), next_level_xp: xpForLevel(level + 1),
    hunger: Math.round(c.hunger!), mood: Math.round(c.mood!),
    streak: streakOf(couple.activity_days || [], couple.tz),
    last_fed_at: c.last_fed_at ?? null, last_pet_at: c.last_pet_at ?? null, accessory: c.accessory ?? 'bow',
  }
}

/** Додає XP і позначає сьогоднішній день активним. Повертає оновлену пару. */
// deno-lint-ignore no-explicit-any
export async function bump(couple: any, xp: number, patch: Partial<CatRaw> = {}) {
  const c = decay(couple.cat || {})
  const cat = { ...c, ...patch, xp: (c.xp ?? 0) + xp }
  if (xp > 0) cat.mood = Math.min(100, (cat.mood ?? 80) + Math.min(10, xp))
  const today = localParts(couple.tz).date
  const days: string[] = couple.activity_days || []
  const activity_days = days.includes(today) ? days : [...days, today].slice(-120)
  const { data } = await db.from('couples').update({ cat, activity_days }).eq('id', couple.id).select().single()
  return data
}
