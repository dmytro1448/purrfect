// Дати в часовому поясі пари (Europe/Riga). ISO-рядки 'YYYY-MM-DD'.
export const TZ = 'Europe/Riga'

const isoFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false })

export const todayISO = (d = new Date()) => isoFmt.format(d)
export const rigaHour = (d = new Date()) => Number(hourFmt.format(d)) % 24

const toUTC = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const fromUTC = (t) => new Date(t).toISOString().slice(0, 10)

export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5)
export const addDays = (iso, n) => fromUTC(toUTC(iso) + n * 864e5)
export const weekday = (iso) => new Date(toUTC(iso)).getUTCDay()
export function addMonths(iso, n, day) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + n, 1))
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  t.setUTCDate(Math.min(day || d, last))
  return fromUTC(t.getTime())
}

export const MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
export const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']
export const WD_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export const WD_FULL = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота']
export const WD_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function fmtDate(iso, { year = true } = {}) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const cur = Number(todayISO().slice(0, 4))
  return `${d} ${MONTHS_GEN[m - 1]}${year && y !== cur ? ` ${y}` : ''}`
}
export function fmtDateFull(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_GEN[m - 1]} ${y}`
}

export function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100, b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}
export const pl = (n, forms) => `${n} ${plural(n, forms)}`
export const DAYS = ['день', 'дні', 'днів']

export function relDay(iso) {
  if (!iso) return ''
  const diff = daysBetween(todayISO(), iso)
  if (diff === 0) return 'Сьогодні'
  if (diff === 1) return 'Завтра'
  if (diff === -1) return 'Вчора'
  if (diff < 0) return `${fmtDate(iso)} · прострочено`
  if (diff < 7) return `${WD_FULL[weekday(iso)][0].toUpperCase()}${WD_FULL[weekday(iso)].slice(1)}`
  return fmtDate(iso)
}

export function nextOccurrence(iso, yearly) {
  const today = todayISO()
  if (!yearly) return iso
  const [, m, d] = iso.split('-')
  let y = Number(today.slice(0, 4))
  let next = `${y}-${m}-${d}`
  if (next < today) next = `${y + 1}-${m}-${d}`
  return next
}

export function isoWeek(iso = todayISO()) {
  const t = new Date(toUTC(iso))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1)
  const wk = Math.ceil(((t.getTime() - y0) / 864e5 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`
}
export function weekRange(week) {
  const [y, w] = week.split('-W').map(Number)
  const jan4 = Date.UTC(y, 0, 4)
  const d4 = new Date(jan4).getUTCDay() || 7
  const mon = jan4 - (d4 - 1) * 864e5 + (w - 1) * 7 * 864e5
  const a = fromUTC(mon), b = fromUTC(mon + 6 * 864e5)
  return `${fmtDate(a, { year: false })} – ${fmtDate(b, { year: false })}`
}

// Найближчі вихідні (субота)
export function nextWeekend() {
  const t = todayISO()
  const wd = weekday(t)
  if (wd === 6 || wd === 0) return t
  return addDays(t, 6 - wd)
}

export const isNight = () => {
  const h = rigaHour()
  return h >= 23 || h < 7
}
