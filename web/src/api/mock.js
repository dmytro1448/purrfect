// Mock-бекенд на localStorage. Та сама семантика, що й у CONTRACT.md.
// Я — tg_id 1 «Дмитро», партнер — tg_id 2 «Надійчик».
import { todayISO, addDays, addMonths, weekday, isoWeek, daysBetween } from '../lib/dates.js'

const KEY = 'purrfect-mock-v1'
const ME = 1, PARTNER = 2
const HOUR = 3600e3

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const nowISO = () => new Date().toISOString()
const clamp = (v) => Math.max(0, Math.min(100, v))
const clone = (o) => JSON.parse(JSON.stringify(o))

function empty() {
  return { couple: null, members: { [ME]: { tg_id: ME, name: 'Дмитро', avatar_url: null, color: 'pink' } }, items: [], opened: {} }
}
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || empty() } catch { return empty() }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)) }

const TITLES = { 1: 'Кошеня', 2: 'Муркотик', 3: 'Пухнастик', 4: 'Хазяїн дивану', 5: 'Королівський кіт', 6: 'Королівський кіт' }
const levelOf = (xp) => Math.floor(Math.sqrt(xp / 20)) + 1
const xpFor = (lvl) => (lvl - 1) ** 2 * 20

function catView(c) {
  const t = Date.now()
  const hunger = Math.round(clamp(c.hunger - ((t - c.hunger_at) / HOUR) * 4))
  const mood = Math.round(clamp(c.mood - ((t - c.mood_at) / HOUR) * 2))
  const level = levelOf(c.xp)
  const today = todayISO()
  const streak = c.last_active && daysBetween(c.last_active, today) <= 1 ? c.streak : 0
  return {
    name: c.name, xp: c.xp, level, level_title: level >= 7 ? 'Легенда муркотіння' : TITLES[level],
    level_xp: xpFor(level), next_level_xp: xpFor(level + 1),
    hunger, mood, streak, last_fed_at: c.last_fed_at, last_pet_at: c.last_pet_at, accessory: 'bow',
  }
}
function setCat(c, patch) {
  const v = catView(c)
  Object.assign(c, { hunger: v.hunger, mood: v.mood, hunger_at: Date.now(), mood_at: Date.now() }, patch)
}
function addXp(s, n) {
  const c = s.couple?.cat
  if (!c) return
  c.xp += n
  const today = todayISO()
  if (c.last_active !== today) {
    c.streak = c.last_active && daysBetween(c.last_active, today) === 1 ? c.streak + 1 : 1
    c.last_active = today
  }
}

function partnerOf(s) {
  const p = s.members[PARTNER]
  if (p) return p
  if (s.couple?.partner_name) return { tg_id: null, name: s.couple.partner_name, avatar_url: null, color: 'violet', pending: true }
  return null
}
function meView(s) {
  if (!s.couple) return { member: s.members[ME], couple: null, partner: null, invite_link: null }
  const { cat, partner_name, ...rest } = s.couple
  void partner_name
  return {
    member: s.members[ME],
    couple: { ...rest, cat: catView(cat), partner_joined: !!s.members[PARTNER] },
    partner: partnerOf(s),
    invite_link: `https://t.me/${s.couple.bot_username}?startapp=join_${s.couple.invite_code}`,
  }
}

// Приватність для глядача ME
function view(s, it) {
  const o = clone(it)
  if (o.kind === 'wish' && o.data.owner === ME) { delete o.data.reserved_by; delete o.data.prep_note }
  if (o.kind === 'compliment' && o.data.to === ME && !o.data.opened_at) o.data.text = null
  if (o.kind === 'checkin' && o.data.by !== ME) {
    const mine = s.items.some((x) => x.kind === 'checkin' && x.data.by === ME && x.data.week === o.data.week)
    if (!mine) { o.data.answers = null; o.data.note = null; o.data.hidden = true }
  }
  return o
}

function nextDue(d) {
  const today = todayISO()
  const base = d.due && d.due > today ? d.due : today
  if (d.type === 'weekly') {
    const wd = d.weekday ?? weekday(d.due || today)
    let n = addDays(base, 1)
    while (weekday(n) !== wd) n = addDays(n, 1)
    return n
  }
  if (d.type === 'monthly') return addMonths(d.due || today, d.every_months || 1, d.month_day)
  return d.due
}

const XP_CREATE = { compliment: 3, checkin: 10, date: 15, place: 5, photo: 2 }

function newCouple(s, { couple_name, started_at, cat_name, partner_name }) {
  s.couple = {
    id: 'c_' + uid(), name: couple_name || 'Ми', started_at: started_at || todayISO(), tz: 'Europe/Riga',
    invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(), bot_username: 'glo14_bot', partner_name: partner_name || 'Надійчик',
    cat: { name: cat_name || 'Ожинка', xp: 0, hunger: 80, hunger_at: Date.now(), mood: 80, mood_at: Date.now(), streak: 0, last_active: null, last_fed_at: null, last_pet_at: null },
  }
}

const methods = {
  me: (s) => meView(s),

  onboard: (s, p) => {
    s.members[ME].name = p.my_name || 'Дмитро'
    newCouple(s, p)
    delete s.members[PARTNER]
    return meView(s)
  },
  join: (s, p) => {
    if (!p.code || p.code.length < 4) throw new Error('bad_code')
    s.members[ME].name = p.my_name || 'Дмитро'
    newCouple(s, { couple_name: 'Ми', partner_name: 'Надійчик' })
    s.members[PARTNER] = { tg_id: PARTNER, name: 'Надійчик', avatar_url: null, color: 'violet' }
    return meView(s)
  },
  'couple.update': (s, p) => {
    if (!s.couple) throw new Error('no_couple')
    if (p.name) s.couple.name = p.name
    if (p.started_at) s.couple.started_at = p.started_at
    if (p.cat_name) s.couple.cat.name = p.cat_name
    if (p.my_name) s.members[ME].name = p.my_name
    if (p.partner_name) {
      s.couple.partner_name = p.partner_name
      if (s.members[PARTNER]) s.members[PARTNER].name = p.partner_name
    }
    return meView(s)
  },

  'items.list': (s, p = {}) => {
    const kinds = p.kinds
    return s.items.filter((i) => !kinds || kinds.includes(i.kind))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((i) => view(s, i))
  },
  'items.create': (s, { kind, data }) => {
    if (!s.couple) throw new Error('no_couple')
    const it = { id: 'i_' + uid(), kind, data: { ...data }, done: false, created_by: ME, created_at: nowISO(), updated_at: nowISO() }
    if (kind === 'checkin') {
      it.data.by = ME
      s.items = s.items.filter((x) => !(x.kind === 'checkin' && x.data.by === ME && x.data.week === it.data.week))
    }
    s.items.push(it)
    if (XP_CREATE[kind]) addXp(s, XP_CREATE[kind])
    return view(s, it)
  },
  'items.update': (s, { id, data, done }) => {
    const it = s.items.find((i) => i.id === id)
    if (!it) throw new Error('not_found')
    if (data) {
      it.data = { ...it.data, ...data }
      for (const k of Object.keys(data)) if (data[k] === null) delete it.data[k]
    }
    if (typeof done === 'boolean') {
      if (done && !it.done) {
        if (it.kind === 'task') addXp(s, 5)
        if (it.kind === 'shop') addXp(s, 1)
      }
      if (it.kind === 'task' && done && it.data.type && it.data.type !== 'once') {
        it.data.due = nextDue(it.data)
        it.data.last_done_at = nowISO()
        it.done = false
      } else it.done = done
    }
    it.updated_at = nowISO()
    return view(s, it)
  },
  'items.delete': (s, { id }) => {
    s.items = s.items.filter((i) => i.id !== id)
    return { ok: true }
  },

  'compliment.open': (s) => {
    const today = todayISO()
    if (s.opened[ME] === today) throw new Error('already_opened_today')
    const pool = s.items.filter((i) => i.kind === 'compliment' && i.data.to === ME && !i.data.opened_at)
    if (!pool.length) return null
    const it = pool[Math.floor(Math.random() * pool.length)]
    it.data.opened_at = nowISO()
    s.opened[ME] = today
    addXp(s, 2)
    return view(s, it)
  },

  'pet.action': (s, { action }) => {
    const c = s.couple?.cat
    if (!c) throw new Error('no_couple')
    if (action === 'feed') {
      if (c.last_fed_at && Date.now() - new Date(c.last_fed_at).getTime() < 4 * HOUR) throw new Error('not_hungry')
      setCat(c, { hunger: 100, last_fed_at: nowISO() })
      addXp(s, 2)
    } else if (action === 'pet') {
      setCat(c, { last_pet_at: nowISO() })
      c.mood = clamp(c.mood + 8)
      addXp(s, 1)
    } else if (action === 'play') {
      setCat(c, {})
      c.mood = clamp(c.mood + 15)
      c.hunger = clamp(c.hunger - 5)
      addXp(s, 1)
    }
    return catView(c)
  },

  'upload.sign': () => ({ upload_url: '', public_url: '' }),

  'link.preview': (s, { url }) => {
    let title = ''
    try {
      const u = new URL(url)
      const slug = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.hostname)
      title = slug.replace(/[-_]+/g, ' ').replace(/\.\w+$/, '').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 60)
    } catch { /* noop */ }
    return { title: title || null, image: null, price: null }
  },

  'ai.recipe': async (s, { url, text } = {}) => {
    await sleep(1000)
    const src = (text || url || '').toLowerCase()
    if (src.includes('борщ')) return AI_RECIPES[1]
    if (src.includes('паст') || src.includes('pasta')) return AI_RECIPES[2]
    return AI_RECIPES[0]
  },
  'ai.ideas': async (s, { vibe, cost, count = 6 } = {}) => {
    await sleep(1000)
    let pool = AI_IDEAS.filter((i) => (!vibe || i.vibe === vibe) && (!cost || i.cost === cost))
    if (pool.length < count) pool = [...pool, ...AI_IDEAS.filter((i) => !pool.includes(i))]
    return pool.sort(() => Math.random() - 0.5).slice(0, count)
  },

  // ---- лише mock
  'mock.partner_join': (s) => {
    s.members[PARTNER] = { tg_id: PARTNER, name: s.couple?.partner_name || 'Надійчик', avatar_url: null, color: 'violet' }
    return meView(s)
  },
  'mock.seed': (s) => {
    seed(s)
    return meView(s)
  },
  'mock.reset': (s) => {
    Object.assign(s, empty())
    return meView(s)
  },
}

export async function mockCall(method, params = {}) {
  await sleep(150 + Math.random() * 150)
  const fn = methods[method]
  if (!fn) throw new Error('unknown_method')
  const s = load()
  const out = await fn(s, params || {})
  save(s)
  return clone(out)
}

// ------------------------------------------------------------------ AI-фейки
const AI_RECIPES = [
  {
    title: 'Сирники з ваніллю та ягодами', minutes: 25, tags: ['сніданок', 'солодке'],
    description: 'Пухкі сирники з хрусткою скоринкою — ідеальний недільний сніданок.',
    ingredients: 'Кисломолочний сир 500 г\nЯйце 1 шт.\nБорошно 3 ст. л.\nЦукор 2 ст. л.\nВанільний цукор 1 пакетик\nЯгоди та сметана для подачі',
    steps: 'Розімни сир виделкою до однорідності.\nДодай яйце, цукор, ваніль і борошно, перемішай.\nСформуй сирники, обваляй у борошні.\nСмаж на середньому вогні по 3 хв з кожного боку.\nПодавай зі сметаною та ягодами.',
    photo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=70',
  },
  {
    title: 'Борщ з копченими реберцями', minutes: 90, tags: ['суп', 'вечеря'],
    description: 'Насичений, трохи димний борщ — ще смачніший наступного дня.',
    ingredients: 'Копчені реберця 400 г\nБуряк 2 шт.\nКартопля 3 шт.\nКапуста 300 г\nМорква, цибуля\nТоматна паста 2 ст. л.\nЧасник, кріп',
    steps: 'Звари бульйон з реберцями (40 хв).\nДодай картоплю та капусту.\nОкремо потуши буряк, моркву й цибулю з томатною пастою.\nОбʼєднай, дай закипіти, додай часник.\nНастоюй 20 хв під кришкою.',
  },
  {
    title: 'Паста з томатами та бурратою', minutes: 20, tags: ['паста', 'швидко'],
    description: 'Яскрава паста за 20 хвилин з ніжною бурратою зверху.',
    ingredients: 'Спагеті 200 г\nЧері 250 г\nЧасник 2 зубчики\nБуррата 1 шт.\nБазилік, оливкова олія',
    steps: 'Відвари пасту al dente.\nОбсмаж часник і чері до лопання.\nЗмішай з пастою та ложкою води від варіння.\nВиклади бурату, полий олією, додай базилік.',
    photo: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=70',
  },
]
const AI_IDEAS = [
  { title: 'Захід сонця на дамбі в Мангальсалі', emoji: '🌅', cost: 'free', vibe: 'out' },
  { title: 'Вечір настолок і какао під пледом', emoji: '🎲', cost: 'free', vibe: 'home' },
  { title: 'Ковзанка на Вермане', emoji: '⛸️', cost: '$', vibe: 'active' },
  { title: 'Глінтвейн на різдвяному ринку в Старій Ризі', emoji: '🍷', cost: '$', vibe: 'out' },
  { title: 'Готуємо рамен з нуля', emoji: '🍜', cost: '$', vibe: 'home' },
  { title: 'SPA-день у Юрмалі', emoji: '🧖', cost: '$$', vibe: 'out' },
  { title: 'Прогулянка болотною стежкою Кемері', emoji: '🥾', cost: 'free', vibe: 'active' },
  { title: 'Кінопоказ у Splendid Palace', emoji: '🎬', cost: '$', vibe: 'out' },
  { title: 'Малюємо портрети одне одного', emoji: '🎨', cost: 'free', vibe: 'home' },
  { title: 'Вечеря на панорамі Skyline bar', emoji: '🌃', cost: '$$', vibe: 'out' },
  { title: 'Велопрогулянка до Межапарку', emoji: '🚲', cost: 'free', vibe: 'active' },
  { title: 'Фотополювання на перший сніг', emoji: '📸', cost: 'free', vibe: 'active' },
]

// ------------------------------------------------------------------ Демо-дані
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`
const P = (seed, w = 600, h = 450) => `https://picsum.photos/seed/${seed}/${w}/${h}`

function seed(s) {
  const t = todayISO()
  s.members[ME].name = s.members[ME].name || 'Дмитро'
  if (!s.couple) newCouple(s, { couple_name: 'Котики', started_at: '2025-01-24', cat_name: 'Ожинка', partner_name: 'Надійчик' })
  s.couple.started_at = '2025-01-24'
  s.members[PARTNER] = { tg_id: PARTNER, name: s.couple.partner_name || 'Надійчик', avatar_url: null, color: 'violet' }
  Object.assign(s.couple.cat, { xp: 255, hunger: 58, hunger_at: Date.now(), mood: 76, mood_at: Date.now(), streak: 12, last_active: t, last_fed_at: new Date(Date.now() - 5 * HOUR).toISOString() })
  s.opened = {}
  let n = 0
  const mk = (kind, data, extra = {}) => {
    n++
    s.items.push({ id: 'i_' + uid() + n, kind, data, done: false, created_by: n % 3 ? ME : PARTNER, created_at: new Date(Date.now() - n * 60e3).toISOString(), updated_at: nowISO(), ...extra })
  }
  s.items = []

  ;[['Вівсяне молоко', '2'], ['Авокадо', '3'], ['Хліб на заквасці'], ['Моцарела'], ['Кава в зернах'], ['Полуниця'], ['Корм для Ожинки']]
    .forEach(([title, qty], i) => mk('shop', { title, ...(qty ? { qty } : {}) }, { done: i >= 5 }))

  mk('task', { title: 'Помити посуд', place: 'Кухня', who: ME, type: 'once', due: t })
  mk('task', { title: 'Купити лампочку у ванну', place: 'Ванна', who: 'both', type: 'once', due: addDays(t, 1), reactions: { [PARTNER]: '❤️' } })
  mk('task', { title: 'Пропилососити', place: 'Вітальня', who: 'both', type: 'weekly', weekday: 6, due: addDays(t, (6 - weekday(t) + 7) % 7) })
  mk('task', { title: 'Поміняти постіль', place: 'Спальня', who: PARTNER, type: 'monthly', every_months: 1, month_day: 1, due: addMonths(t, 1, 1), remind_days: 1 })
  mk('task', { title: 'Полити квіти', place: 'Балкон', who: ME, type: 'weekly', weekday: 3, due: addDays(t, (3 - weekday(t) + 7) % 7 || 7), reactions: { [PARTNER]: '🌸' } })
  mk('task', { title: 'Розібрати шафу', place: 'Спальня', who: 'both', type: 'once' }, { done: true })

  mk('reminder', { title: 'Випити вітамінки', time: '09:00', days: [], who: PARTNER, enabled: true })
  mk('reminder', { title: 'Подзвонити мамі', time: '18:30', days: [0], who: ME, enabled: true })
  mk('reminder', { title: 'Винести сміття', time: '20:00', days: [2, 5], who: 'both', enabled: false })

  const recipes = [
    ['Боул з лососем і авокадо', '1546069901-ba9599a7e63c', ['вечеря', 'здорове'], 25, 'Свіжий боул з рисом, лососем, авокадо та кунжутним соусом.'],
    ['Піца Маргарита', '1565299624946-b28f40a0ae38', ['вечеря', 'на двох'], 45, 'Тонке тісто, томати, моцарела і свіжий базилік.'],
    ['Панкейки з ягодами', '1567620905732-2d1ec7ab7445', ['сніданок', 'солодке'], 20, 'Пухкі американські панкейки з кленовим сиропом.'],
    ['Паста з томатами', '1473093295043-cdd812d0e601', ['паста', 'швидко'], 20, 'Проста паста з чері, часником і пармезаном.'],
    ['Салат з печеними овочами', '1512621776951-a57141f2eefd', ['здорове', 'швидко'], 30, 'Теплий салат з печеним гарбузом, нутом і фетою.'],
    ['Стейк з овочами', '1504674900247-0877df9cc836', ['вечеря', 'на двох'], 35, 'Соковитий стейк medium з овочами гриль.'],
    ['Тірамісу', '1571877227200-a0d98ea607e9', ['солодке', 'на двох'], 30, 'Класичний італійський десерт без випікання.'],
    ['Тайський суп', '1547592180-85f173990554', ['суп', 'вечеря'], 40, 'Гострий кокосовий суп з креветками та лаймом.'],
  ]
  recipes.forEach(([title, img, tags, minutes, description]) => mk('recipe', {
    title, photo: U(img), tags, minutes, description,
    ingredients: 'Основний інгредієнт 300 г\nОливкова олія 2 ст. л.\nЧасник 2 зубчики\nСіль, перець за смаком\nЗелень для подачі',
    steps: 'Підготуй усі інгредієнти.\nРозігрій сковороду з олією.\nГотуй основу 10–15 хв.\nПриправ, подавай з зеленню.',
  }))

  mk('wish', { title: 'Бездротові навушники', list: 'gift', owner: ME, image: U('1505740420928-5e560c06d30e'), price: '6 500 ₴', url: 'https://example.com/headphones' })
  mk('wish', { title: 'Класичний годинник', list: 'gift', owner: ME, image: U('1523275335684-37898b6baf30'), price: '4 200 ₴' })
  mk('wish', { title: 'Книга «Маленький принц» з ілюстраціями', list: 'gift', owner: ME, price: '650 ₴' })
  mk('wish', { title: 'Червоні кросівки', list: 'gift', owner: PARTNER, image: U('1542291026-7eec264c27ff'), price: '3 900 ₴', reserved_by: ME, prep_note: 'Розмір 38, перевірити наявність до 20-го' })
  mk('wish', { title: 'Плівковий фотоапарат', list: 'gift', owner: PARTNER, image: U('1526170375885-4d8ecf77b99f'), price: '5 300 ₴' })
  mk('wish', { title: 'Сонцезахисні окуляри', list: 'gift', owner: PARTNER, image: U('1572635196237-14b3f281503f'), price: '2 100 ₴' })
  mk('wish', { title: 'Інтерстеллар', list: 'watch', owner: ME, note: 'Пересмотріти в IMAX' })
  mk('wish', { title: 'Амелі', list: 'watch', owner: PARTNER, note: 'Французький вечір' })
  mk('wish', { title: 'Шоґун', list: 'watch', owner: ME, note: 'Серіал на зиму' })
  mk('wish', { title: 'Гордість і упередження', list: 'watch', owner: PARTNER })
  mk('wish', { title: 'Подорож до Японії під час сакури', list: 'dream', owner: ME, emoji: '🌸' })
  mk('wish', { title: 'Своя квартира з великим балконом', list: 'dream', owner: PARTNER, emoji: '🏡' })
  mk('wish', { title: 'Побачити північне сяйво', list: 'dream', owner: PARTNER, emoji: '🌌' })

  mk('place', { title: 'Стара Рига', lat: 56.9496, lng: 24.1052, status: 'been', category: 'Прогулянка', rating: 5, note: 'Наше перше побачення 💗', address: 'Vecrīga, Rīga', photos: [P('old-riga')] })
  mk('place', { title: 'Пляж Юрмали', lat: 56.968, lng: 23.77, status: 'been', category: 'Природа', rating: 5, address: 'Jūrmala', photos: [P('jurmala-beach')] })
  mk('place', { title: 'Центральний ринок', lat: 56.9441, lng: 24.1144, status: 'been', category: 'Їжа', rating: 4, address: 'Prāgas iela 1, Rīga' })
  mk('place', { title: 'Кав’ярня на Бривібас', lat: 56.9566, lng: 24.1213, status: 'been', category: 'Кафе', rating: 4, address: 'Brīvības iela, Rīga' })
  mk('place', { title: 'Сігулда восени', lat: 57.1537, lng: 24.8531, status: 'want', category: 'Природа', note: 'Канатна дорога та замок' })
  mk('place', { title: 'Ботанічний сад', lat: 56.9506, lng: 24.0583, status: 'want', category: 'Прогулянка' })
  mk('place', { title: 'Ресторан на 26 поверсі', lat: 56.9561, lng: 24.1170, status: 'want', category: 'Ресторан', note: 'На річницю' })

  mk('date', { title: 'Перше побачення', date: '2025-01-24', kind: 'date', note: 'Кава, яка тривала 5 годин', photos: [P('first-date')] })
  mk('date', { title: 'Вікенд у Таллінні', date: '2025-05-10', kind: 'trip', note: 'Старе місто і найсмачніший марципан', photos: [P('tallinn-trip'), P('tallinn-2')] })
  mk('date', { title: 'Пікнік у Юрмалі', date: '2025-07-19', kind: 'date', photos: [P('picnic-sea')] })
  mk('date', { title: 'Новий рік удвох', date: '2025-12-31', kind: 'date', note: 'Феєрверк над Даугавою', photos: [P('fireworks')] })
  mk('date', { title: 'Поїздка до Вільнюса', date: '2026-03-14', kind: 'trip', photos: [P('vilnius-old')] })
  mk('date', { title: 'Кіно + піца', date: '2026-10-02', kind: 'date' })

  ;[
    ['Пікнік на даху', '🧺', '$', 'out'], ['Кіномарафон Ґіблі', '🎬', 'free', 'home'], ['Скеледром', '🧗', '$$', 'active'],
    ['Готуємо суші вдвох', '🍣', '$', 'home'], ['Велопрогулянка в Межапарк', '🚲', 'free', 'active'], ['Вечеря при свічках', '🕯️', '$$', 'home'],
    ['Концерт у Dzintari', '🎶', '$$', 'out'], ['Захід сонця на дамбі', '🌅', 'free', 'out'], ['Майстер-клас з кераміки', '🏺', '$$', 'out'],
    ['Настолки та какао', '🎲', 'free', 'home'],
  ].forEach(([title, emoji, cost, vibe]) => mk('idea', { title, emoji, cost, vibe }))

  mk('compliment', { text: 'Ти робиш навіть понеділки теплими ☀️', to: ME })
  mk('compliment', { text: 'Обожнюю, як ти смієшся з власних жартів раніше, ніж їх доказуєш', to: ME })
  mk('compliment', { text: 'Ти мій найулюбленіший дім', to: ME })
  mk('compliment', { text: 'Дякую, що завжди питаєш, як пройшов мій день 💗', to: ME, opened_at: new Date(Date.now() - 3 * 864e5).toISOString() })
  s.items[s.items.length - 1].created_by = PARTNER
  s.items.slice(-4).forEach((x) => { x.created_by = PARTNER })
  mk('compliment', { text: 'Ти неймовірно красива, коли зосереджена', to: PARTNER }, { created_by: ME })
  mk('compliment', { text: 'З тобою навіть черга в магазині — пригода', to: PARTNER, opened_at: nowISO() }, { created_by: ME })

  ;[['sunset-couple', 600, 800, 'Улюблений кадр'], ['coffee-morning', 600, 450, 'Той самий вікенд'], ['city-lights', 600, 750, ''], ['forest-walk', 600, 450, 'Прогулянка без плану'],
    ['sea-view', 600, 800, 'Хочу туди знову'], ['cat-window', 600, 600, ''], ['snow-day', 600, 450, 'Просто так 💗'], ['flowers-bouquet', 600, 780, '']]
    .forEach(([sd, w, h, caption], i) => mk('photo', { url: P(sd, w, h), caption, taken_at: addDays(t, -i * 9) }))

  mk('special', { title: 'Наша річниця', date: '2025-01-24', yearly: true, remind_days: 7, emoji: '💞' })
  mk('special', { title: 'День народження Надійчика', date: '2001-12-05', yearly: true, remind_days: 14, emoji: '🎂' })
  mk('special', { title: 'День народження Дмитра', date: '1999-03-17', yearly: true, remind_days: 7, emoji: '🎁' })
  mk('special', { title: 'Концерт улюбленого гурту', date: addDays(t, 13), yearly: false, remind_days: 2, emoji: '🎸' })

  const w = isoWeek(t), pw = isoWeek(addDays(t, -7)), ppw = isoWeek(addDays(t, -14))
  mk('checkin', { week: w, by: PARTNER, answers: { heard: 4, support: 5, close: 4, time: 3, week: 4 }, note: 'Хочу більше вечорів без телефонів' }, { created_by: PARTNER })
  mk('checkin', { week: pw, by: PARTNER, answers: { heard: 5, support: 4, close: 5, time: 4, week: 5 } }, { created_by: PARTNER })
  mk('checkin', { week: pw, by: ME, answers: { heard: 4, support: 5, close: 5, time: 4, week: 4 } }, { created_by: ME })
  mk('checkin', { week: ppw, by: PARTNER, answers: { heard: 3, support: 4, close: 4, time: 3, week: 3 } }, { created_by: PARTNER })
  mk('checkin', { week: ppw, by: ME, answers: { heard: 4, support: 4, close: 3, time: 3, week: 4 } }, { created_by: ME })
}
