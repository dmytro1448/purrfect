/** Дата/час у часовому поясі пари */
export function localParts(tz: string, d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(d)) o[p.type] = p.value
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday)
  const hour = o.hour === '24' ? '00' : o.hour
  return { date: `${o.year}-${o.month}-${o.day}`, hm: `${hour}:${o.minute}`, minutes: Number(hour) * 60 + Number(o.minute), weekday: wd }
}
export function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}
export function diffDays(a: string, b: string) {
  return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000)
}
export function addMonths(date: string, n: number, day?: number) {
  const d = new Date(date + 'T12:00:00Z')
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, 12))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate()
  target.setUTCDate(Math.min(day ?? d.getUTCDate(), last))
  return target.toISOString().slice(0, 10)
}
/** Наступна дата щорічної події (для special.yearly) */
export function nextYearly(date: string, today: string) {
  const [, m, dd] = date.split('-')
  let y = Number(today.slice(0, 4))
  let cand = `${y}-${m}-${dd}`
  if (cand < today) cand = `${y + 1}-${m}-${dd}`
  return cand
}
