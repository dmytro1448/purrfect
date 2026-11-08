// Викликається pg_cron кожні 5 хв: розсилає нагадування
import { db } from '../_shared/db.ts'
import { sendTo, esc } from '../_shared/tg.ts'
import { localParts, addDays, diffDays, nextYearly } from '../_shared/time.ts'
import { decay } from '../_shared/cat.ts'

const SECRET = Deno.env.get('CRON_SECRET') ?? ''
const MORNING = 10 * 60, EVENING = 19 * 60

// deno-lint-ignore no-explicit-any
type Any = any

async function once(key: string) {
  const { error } = await db.from('sent_log').insert({ key })
  return !error // false якщо вже надсилали
}

function plural(n: number) { return n === 1 ? 'день' : n >= 2 && n <= 4 ? 'дні' : 'днів' }

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== SECRET) return new Response('no', { status: 403 })
  const { data: couples } = await db.from('couples').select()
  let sent = 0
  for (const c of couples ?? []) {
    const { data: members } = await db.from('members').select().eq('couple_id', c.id)
    if (!members?.length) continue
    const ids = members.map((m: Any) => Number(m.tg_id))
    const to = (who: Any) => (who && who !== 'both' && ids.includes(Number(who)) ? [Number(who)] : ids)
    const now = localParts(c.tz)
    const { data: items } = await db.from('items').select().eq('couple_id', c.id).in('kind', ['reminder', 'task', 'special'])
    const send = async (key: string, who: Any, text: string) => {
      if (!(await once(key))) return
      for (const id of to(who)) { await sendTo(id, text).catch(() => {}); sent++ }
    }

    for (const it of items ?? []) {
      const d = it.data || {}
      if (it.kind === 'reminder' && d.enabled !== false && d.time) {
        const [h, m] = String(d.time).split(':').map(Number)
        const t = h * 60 + m
        const days: number[] = Array.isArray(d.days) ? d.days.map(Number) : []
        if ((days.length === 0 || days.includes(now.weekday)) && now.minutes >= t && now.minutes - t < 60)
          await send(`rem:${it.id}:${now.date}`, d.who, `🔔 ${esc(d.title)}`)
      }
      if (it.kind === 'task' && !it.done && d.due && now.minutes >= MORNING) {
        const left = diffDays(d.due, now.date)
        const rd = Number(d.remind_days || 0)
        if (left === 0) await send(`task:${it.id}:${d.due}:0`, d.who, `📝 Сьогодні: <b>${esc(d.title)}</b>${d.place ? ` · ${esc(d.place)}` : ''}`)
        else if (rd > 0 && left === rd) await send(`task:${it.id}:${d.due}:${rd}`, d.who, `⏳ Через ${rd} ${plural(rd)}: <b>${esc(d.title)}</b>`)
      }
      if (it.kind === 'special' && d.date && now.minutes >= MORNING) {
        const date = d.yearly ? nextYearly(d.date, now.date) : d.date
        const left = diffDays(date, now.date)
        const rd = Number(d.remind_days ?? 3)
        const em = d.emoji || '💗'
        if (left === 0) await send(`sp:${it.id}:${date}:0`, 'both', `${em} Сьогодні — <b>${esc(d.title)}</b>!`)
        else if (rd > 0 && left === rd) await send(`sp:${it.id}:${date}:${rd}`, 'both', `${em} Через ${rd} ${plural(rd)} — <b>${esc(d.title)}</b>. Саме час підготуватись 😉`)
      }
    }

    // Річниця стосунків (щомісяця в цей день — «N місяців разом», щороку — річниця)
    if (c.started_at && now.minutes >= MORNING && c.started_at.slice(8, 10) === now.date.slice(8, 10) && c.started_at < now.date) {
      const months = (Number(now.date.slice(0, 4)) - Number(c.started_at.slice(0, 4))) * 12 + Number(now.date.slice(5, 7)) - Number(c.started_at.slice(5, 7))
      if (months > 0) {
        const txt = months % 12 === 0 ? `🎉 Сьогодні ${months / 12} р. разом! Вітаю вас, ${esc(c.name)} 💞` : `💗 Сьогодні ${months} міс. разом. Маленьке свято — обійміться!`
        await send(`anniv:${c.id}:${now.date}`, 'both', txt)
      }
    }

    // Котик голодний
    const cat = decay(c.cat || {})
    if (now.minutes >= EVENING && now.minutes < EVENING + 60 && (cat.hunger ?? 100) < 25)
      await send(`cat:${c.id}:${now.date}`, 'both', `🐈‍⬛ ${esc(cat.name || 'Котик')} зголоднів і сумно дивиться на миску… Погодуйте його 🥺`)
  }
  // прибирання журналу
  await db.from('sent_log').delete().lt('sent_at', new Date(Date.now() - 400 * 86400000).toISOString())
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } })
})

export { addDays }
