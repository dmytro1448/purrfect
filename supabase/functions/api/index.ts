// Purrfect API — див. CONTRACT.md
import { db, broadcast } from '../_shared/db.ts'
import { verifyInitData, sendTo, esc, BOT_USERNAME, type TgUser } from '../_shared/tg.ts'
import { bump, catView, decay } from '../_shared/cat.ts'
import { localParts, addDays, addMonths } from '../_shared/time.ts'
import { aiJson } from '../_shared/ai.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-init-data',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const KINDS = new Set(['shop', 'task', 'reminder', 'recipe', 'wish', 'place', 'date', 'idea', 'compliment', 'photo', 'special', 'checkin'])
const XP: Record<string, number> = { compliment: 3, checkin: 10, date: 15, place: 5, photo: 2 }

class ApiError extends Error {}
const fail = (m: string): never => { throw new ApiError(m) }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
type Any = any
type Ctx = { user: TgUser; member: Any; couple: Any | null; partner: Any | null }

async function loadCtx(user: TgUser): Promise<Ctx> {
  const avatar = user.photo_url ?? null
  let { data: member } = await db.from('members').select().eq('tg_id', user.id).maybeSingle()
  if (!member) {
    const ins = await db.from('members').insert({ tg_id: user.id, name: user.first_name ?? '', username: user.username, avatar_url: avatar }).select().single()
    member = ins.data
  } else if ((avatar && member.avatar_url !== avatar) || member.username !== (user.username ?? null)) {
    await db.from('members').update({ avatar_url: avatar ?? member.avatar_url, username: user.username ?? null }).eq('tg_id', user.id)
    member.avatar_url = avatar ?? member.avatar_url
  }
  let couple = null, partner = null
  if (member.couple_id) {
    couple = (await db.from('couples').select().eq('id', member.couple_id).single()).data
    partner = (await db.from('members').select().eq('couple_id', member.couple_id).neq('tg_id', user.id).maybeSingle()).data
  }
  return { user, member, couple, partner }
}

const pubMember = (m: Any) => m && ({ tg_id: m.tg_id, name: m.name, avatar_url: m.avatar_url, color: m.color })

function meView(ctx: Ctx) {
  const c = ctx.couple
  return {
    member: pubMember(ctx.member),
    couple: c && {
      id: c.id, name: c.name, started_at: c.started_at, tz: c.tz, invite_code: c.invite_code, bot_username: BOT_USERNAME,
      cat: catView(c), partner_joined: !!ctx.partner,
    },
    partner: ctx.partner ? pubMember(ctx.partner) : c ? { tg_id: null, name: c.meta?.partner_name || 'Партнер', avatar_url: null, color: 'violet', pending: true } : null,
    invite_link: c && !ctx.partner ? `https://t.me/${BOT_USERNAME}?start=${c.invite_code}` : null,
  }
}

// Приватність: що бачить конкретний глядач
function viewItem(it: Any, viewer: number, myCheckinWeeks: Set<string>) {
  const d = { ...it.data }
  if (it.kind === 'wish' && Number(d.owner) === viewer) { delete d.reserved_by; delete d.prep_note }
  if (it.kind === 'compliment' && Number(d.to) === viewer && !d.opened_at) d.text = null
  if (it.kind === 'checkin' && Number(d.by) !== viewer && !myCheckinWeeks.has(d.week)) { d.answers = null; d.note = null; d.hidden = true }
  return { id: it.id, kind: it.kind, data: d, done: it.done, created_by: it.created_by, created_at: it.created_at, updated_at: it.updated_at }
}

async function viewOne(ctx: Ctx, it: Any) {
  const weeks = new Set<string>()
  if (it.kind === 'checkin') {
    const { data } = await db.from('items').select('data').eq('couple_id', ctx.couple.id).eq('kind', 'checkin')
    for (const r of data ?? []) if (Number(r.data.by) === ctx.user.id) weeks.add(r.data.week)
  }
  return viewItem(it, ctx.user.id, weeks)
}

function nextDue(d: Any, tz: string) {
  const today = localParts(tz).date
  const base = d.due && d.due >= today ? d.due : today
  if (d.type === 'weekly') {
    const wd = Number(d.weekday ?? new Date(base + 'T12:00:00Z').getUTCDay())
    let x = addDays(base, 1)
    while (new Date(x + 'T12:00:00Z').getUTCDay() !== wd) x = addDays(x, 1)
    return x
  }
  if (d.type === 'monthly') return addMonths(base, Math.max(1, Number(d.every_months || 1)), d.month_day ? Number(d.month_day) : undefined)
  return d.due
}

const nameOf = (ctx: Ctx) => esc(ctx.member.name || ctx.user.first_name || 'Партнер')

async function notifyPartner(ctx: Ctx, text: string) {
  if (ctx.partner) await sendTo(ctx.partner.tg_id, text).catch(() => {})
}

async function needCouple(ctx: Ctx) { if (!ctx.couple) fail('no_couple'); return ctx.couple }

async function getOwnItem(ctx: Ctx, id: string) {
  const { data } = await db.from('items').select().eq('id', id).eq('couple_id', ctx.couple.id).maybeSingle()
  if (!data) fail('not_found')
  return data
}

async function linkPreview(url: string) {
  if (!/^https?:\/\//i.test(url)) fail('bad_url')
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000)
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PurrfectBot/1.0; +https://t.me)', 'Accept-Language': 'uk,en;q=0.8' } })
    const html = (await r.text()).slice(0, 400_000)
    const meta = (prop: string) => {
      const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]*>`, 'i')
      const tag = html.match(re)?.[0]
      return tag?.match(/content=["']([^"']*)["']/i)?.[1]
    }
    const decode = (s?: string) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
    let image = decode(meta('og:image') || meta('twitter:image') || meta('image'))
    if (image && !/^https?:/i.test(image)) image = new URL(image, r.url).toString()
    const title = decode(meta('og:title') || meta('twitter:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1])
    const amount = meta('product:price:amount') || meta('og:price:amount') || meta('price')
    const cur = meta('product:price:currency') || meta('og:price:currency') || meta('priceCurrency')
    const price = amount ? `${amount}${cur ? ' ' + cur : ''}` : undefined
    return { title, image, price }
  } catch { return {} } finally { clearTimeout(t) }
}

async function handle(ctx: Ctx, method: string, p: Any) {
  switch (method) {
    case 'me': return meView(ctx)

    case 'onboard': {
      if (ctx.couple) return meView(ctx)
      const { data: couple, error } = await db.from('couples').insert({
        name: String(p.couple_name || 'Ми').slice(0, 60),
        started_at: p.started_at || null,
        cat: { name: String(p.cat_name || 'Мурчик').slice(0, 30), xp: 0, hunger: 90, mood: 90, at: new Date().toISOString() },
        meta: { partner_name: String(p.partner_name || '').slice(0, 40) },
      }).select().single()
      if (error) fail(error.message)
      await db.from('members').update({ couple_id: couple.id, name: String(p.my_name || ctx.member.name).slice(0, 40), color: 'pink' }).eq('tg_id', ctx.user.id)
      return meView(await loadCtx(ctx.user))
    }

    case 'join': {
      if (ctx.couple) return meView(ctx)
      const code = String(p.code || '').trim().toUpperCase()
      const { data: couple } = await db.from('couples').select().eq('invite_code', code).maybeSingle()
      if (!couple) fail('bad_code')
      const { count } = await db.from('members').select('tg_id', { count: 'exact', head: true }).eq('couple_id', couple.id)
      if ((count ?? 0) >= 2) fail('couple_full')
      const name = String(p.my_name || couple.meta?.partner_name || ctx.user.first_name || '').slice(0, 40)
      await db.from('members').update({ couple_id: couple.id, name, color: 'violet' }).eq('tg_id', ctx.user.id)
      const fresh = await loadCtx(ctx.user)
      if (fresh.partner) await sendTo(fresh.partner.tg_id, `💞 ${esc(name)} приєдналася до «${esc(couple.name)}». Тепер ви разом і тут!`).catch(() => {})
      await broadcast(couple.id)
      return meView(fresh)
    }

    case 'couple.update': {
      const c = await needCouple(ctx)
      const upd: Any = {}
      if (p.name != null) upd.name = String(p.name).slice(0, 60)
      if (p.started_at !== undefined) upd.started_at = p.started_at || null
      if (p.cat_name != null) upd.cat = { ...c.cat, name: String(p.cat_name).slice(0, 30) }
      if (p.partner_name != null) upd.meta = { ...c.meta, partner_name: String(p.partner_name).slice(0, 40) }
      if (Object.keys(upd).length) await db.from('couples').update(upd).eq('id', c.id)
      if (p.my_name != null) await db.from('members').update({ name: String(p.my_name).slice(0, 40) }).eq('tg_id', ctx.user.id)
      await broadcast(c.id)
      return meView(await loadCtx(ctx.user))
    }

    case 'items.list': {
      const c = await needCouple(ctx)
      let q = db.from('items').select().eq('couple_id', c.id).order('created_at', { ascending: false }).limit(2000)
      if (Array.isArray(p.kinds) && p.kinds.length) q = q.in('kind', p.kinds)
      const { data } = await q
      const all = data ?? []
      let weeks = new Set<string>()
      if (all.some((i: Any) => i.kind === 'checkin')) {
        weeks = new Set(all.filter((i: Any) => i.kind === 'checkin' && Number(i.data.by) === ctx.user.id).map((i: Any) => i.data.week))
      }
      return all.map((i: Any) => viewItem(i, ctx.user.id, weeks))
    }

    case 'items.create': {
      let c = await needCouple(ctx)
      if (!KINDS.has(p.kind)) fail('bad_kind')
      const data = { ...(p.data || {}) }
      if (p.kind === 'wish' && !data.owner) data.owner = ctx.user.id
      if (p.kind === 'checkin') {
        data.by = ctx.user.id
        const { data: ex } = await db.from('items').select('id').eq('couple_id', c.id).eq('kind', 'checkin').eq('data->>week', String(data.week)).eq('data->>by', String(ctx.user.id)).maybeSingle()
        if (ex) {
          const { data: up } = await db.from('items').update({ data, updated_at: new Date().toISOString() }).eq('id', ex.id).select().single()
          await broadcast(c.id)
          return await viewOne(ctx, up)
        }
      }
      if (p.kind === 'compliment') { data.to = data.to ?? ctx.partner?.tg_id ?? null; delete data.opened_at }
      const { data: it, error } = await db.from('items').insert({ couple_id: c.id, kind: p.kind, data, created_by: ctx.user.id }).select().single()
      if (error) fail(error.message)
      c = await bump(c, XP[p.kind] ?? 0)
      if (p.kind === 'compliment') await notifyPartner(ctx, `💌 ${nameOf(ctx)} поклав(ла) тобі записку в банку компліментів. Відкрий, коли захочеш ✨`)
      if (p.kind === 'task' && ctx.partner && Number(data.who) === ctx.partner.tg_id) await notifyPartner(ctx, `📝 ${nameOf(ctx)} додав(ла) тобі справу: <b>${esc(data.title)}</b>`)
      if (p.kind === 'checkin') {
        const { data: other } = await db.from('items').select('id').eq('couple_id', c.id).eq('kind', 'checkin').eq('data->>week', String(data.week)).neq('data->>by', String(ctx.user.id)).maybeSingle()
        await notifyPartner(ctx, other ? `💞 ${nameOf(ctx)} теж пройшов(ла) чек-ін тижня — подивіться результати разом` : `💭 ${nameOf(ctx)} пройшов(ла) чек-ін тижня. Твоя черга — тоді побачите відповіді одне одного`)
      }
      await broadcast(c.id)
      return await viewOne(ctx, it)
    }

    case 'items.update': {
      const c = await needCouple(ctx)
      const it = await getOwnItem(ctx, p.id)
      const data = p.data ? { ...it.data, ...p.data } : { ...it.data }
      // захист приватних полів
      if (it.kind === 'compliment') { data.text = Number(it.data.to) === ctx.user.id ? it.data.text : (p.data?.text ?? it.data.text); data.opened_at = it.data.opened_at; data.to = it.data.to }
      if (it.kind === 'wish' && Number(it.data.owner) === ctx.user.id) { data.reserved_by = it.data.reserved_by; data.prep_note = it.data.prep_note }
      if (it.kind === 'checkin' && Number(it.data.by) !== ctx.user.id) fail('forbidden')
      let done = typeof p.done === 'boolean' ? p.done : it.done
      let xp = 0
      if (typeof p.done === 'boolean' && p.done && !it.done) {
        xp = it.kind === 'task' ? 5 : it.kind === 'shop' ? 1 : 0
        if (it.kind === 'task' && (data.type === 'weekly' || data.type === 'monthly')) {
          data.due = nextDue(data, c.tz); data.last_done_at = new Date().toISOString(); data.last_done_by = ctx.user.id; done = false
        }
        if (it.kind === 'task') data.done_by = ctx.user.id
      }
      const { data: up, error } = await db.from('items').update({ data, done, updated_at: new Date().toISOString() }).eq('id', it.id).select().single()
      if (error) fail(error.message)
      if (xp) await bump(c, xp)
      await broadcast(c.id)
      return await viewOne(ctx, up)
    }

    case 'items.delete': {
      const c = await needCouple(ctx)
      const it = await getOwnItem(ctx, p.id)
      if (it.kind === 'compliment' && Number(it.data.to) === ctx.user.id && !it.data.opened_at) fail('forbidden')
      await db.from('items').delete().eq('id', it.id)
      await broadcast(c.id)
      return { ok: true }
    }

    case 'compliment.open': {
      const c = await needCouple(ctx)
      const { data: mine } = await db.from('items').select().eq('couple_id', c.id).eq('kind', 'compliment').eq('data->>to', String(ctx.user.id))
      const today = localParts(c.tz).date
      if ((mine ?? []).some((i: Any) => i.data.opened_at && localParts(c.tz, new Date(i.data.opened_at)).date === today)) fail('already_opened_today')
      const closed = (mine ?? []).filter((i: Any) => !i.data.opened_at)
      if (!closed.length) return null
      const pick = closed[Math.floor(Math.random() * closed.length)]
      const { data: up } = await db.from('items').update({ data: { ...pick.data, opened_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', pick.id).select().single()
      await bump(c, 2)
      await broadcast(c.id)
      return await viewOne(ctx, up)
    }

    case 'pet.action': {
      const c = await needCouple(ctx)
      const cat = decay(c.cat || {})
      const now = new Date().toISOString()
      let updated
      if (p.action === 'feed') {
        if (c.cat?.last_fed_at && Date.now() - Date.parse(c.cat.last_fed_at) < 4 * 3600000 && (cat.hunger ?? 0) > 60) fail('not_hungry')
        updated = await bump({ ...c, cat }, 2, { hunger: 100, last_fed_at: now, mood: Math.min(100, (cat.mood ?? 0) + 10) })
      } else if (p.action === 'pet' || p.action === 'play') {
        const recent = c.cat?.last_pet_at && Date.now() - Date.parse(c.cat.last_pet_at) < 60_000
        updated = await bump({ ...c, cat }, recent ? 0 : 1, { mood: Math.min(100, (cat.mood ?? 0) + (p.action === 'play' ? 15 : 8)), last_pet_at: now })
      } else fail('bad_action')
      await broadcast(c.id)
      return catView(updated)
    }

    case 'upload.sign': {
      const c = await needCouple(ctx)
      const ext = ['jpg', 'png', 'webp'].includes(p.ext) ? p.ext : 'jpg'
      const path = `${c.id}/${crypto.randomUUID()}.${ext}`
      const { data, error } = await db.storage.from('photos').createSignedUploadUrl(path)
      if (error) fail(error.message)
      const pub = db.storage.from('photos').getPublicUrl(path).data.publicUrl
      return { upload_url: data!.signedUrl, public_url: pub }
    }

    case 'link.preview': return await linkPreview(String(p.url || ''))

    case 'ai.recipe': {
      await needCouple(ctx)
      let src = String(p.text || '').slice(0, 12000), photo: string | undefined
      if (p.url) {
        const u = String(p.url)
        if (!/^https?:\/\//i.test(u)) fail('bad_url')
        const prev = await linkPreview(u) as Any
        photo = prev.image
        try {
          const html = await (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()
          const ld = [...html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n').slice(0, 8000)
          const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 9000)
          src = `TITLE: ${prev.title ?? ''}\nJSON-LD: ${ld}\nTEXT: ${text}`
        } catch { fail('fetch_failed') }
      }
      if (!src.trim()) fail('empty')
      const r = await aiJson(
        'Ти кулінарний помічник. Витягни рецепт і поверни JSON українською: {"title":string,"description":string (1-2 речення),"ingredients":string (кожен інгредієнт з нового рядка, з кількістю),"steps":string (нумеровані кроки з нового рядка),"tags":string[] (2-4 коротких теги, напр. "вечеря","швидко"),"minutes":number|null}. Якщо рецепту немає — {"error":"no_recipe"}.',
        src)
      if (r.error) fail('no_recipe')
      return { ...r, photo: photo ?? null }
    }

    case 'ai.ideas': {
      const c = await needCouple(ctx)
      const { data: ex } = await db.from('items').select('data').eq('couple_id', c.id).eq('kind', 'idea').limit(100)
      const existing = (ex ?? []).map((i: Any) => i.data.title).join('; ')
      const month = new Intl.DateTimeFormat('uk', { month: 'long', timeZone: c.tz }).format(new Date())
      const r = await aiJson(
        'Ти креативний помічник для закоханої пари з Риги (Латвія). Поверни JSON {"ideas":[{"title":string (коротко, до 60 символів, українською),"emoji":string (1 емодзі),"cost":"free"|"$"|"$$","vibe":"home"|"out"|"active"}]}. Ідеї конкретні, романтичні, різноманітні, реалістичні для сезону.',
        `Місяць: ${month}. Кількість: ${Math.min(10, Number(p.count) || 6)}. Настрій: ${p.vibe || 'будь-який'}. Бюджет: ${p.cost || 'будь-який'}. Не повторюй: ${existing}`)
      return (r.ideas ?? []).slice(0, 10)
    }

    default: fail('unknown_method')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405)
  try {
    const auth = await verifyInitData(req.headers.get('x-init-data') || '')
    if (!auth?.user?.id) return json({ ok: false, error: 'unauthorized' }, 401)
    const { method, params } = await req.json()
    const ctx = await loadCtx(auth.user)
    const data = await handle(ctx, String(method), params || {})
    return json({ ok: true, data: data ?? null })
  } catch (e) {
    if (e instanceof ApiError) return json({ ok: false, error: e.message }, 400)
    console.error(e)
    return json({ ok: false, error: 'server_error' }, 500)
  }
})
