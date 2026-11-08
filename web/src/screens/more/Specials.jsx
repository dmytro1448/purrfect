import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { haptic } from '../../lib/telegram.js'
import { daysBetween, fmtDate, nextOccurrence, todayISO, fmtDateFull } from '../../lib/dates.js'
import Sheet from '../../components/Sheet.jsx'
import Cat from '../../components/Cat.jsx'
import { Button, Empty, Field, Stepper, Toggle, spring, CountUp } from '../../components/ui.jsx'

const EMOJIS = ['💞', '🎂', '🎁', '💍', '✈️', '🎸', '🌹', '🏡', '🎉', '⭐']

export default function Specials() {
  const { byKind } = useStore()
  const [edit, setEdit] = useState(null)
  const t = todayISO()
  const list = (byKind.special || []).map((s) => ({ ...s, next: nextOccurrence(s.data.date, s.data.yearly) }))
    .sort((a, b) => {
      const pa = a.next < t, pb = b.next < t
      if (pa !== pb) return pa ? 1 : -1
      return pa ? (a.next < b.next ? 1 : -1) : (a.next < b.next ? -1 : 1)
    })
  const [first, ...rest] = list
  return (
    <div className="stack">
      {!list.length ? (
        <Empty title="Жодної дати" text="Річниця, дні народження, концерт — бот нагадає заздалегідь" action="Додати дату" onAction={() => setEdit({})}>
          <Cat state="happy" size={110} />
        </Empty>
      ) : (
        <>
          {first && first.next >= t && <Hero s={first} onClick={() => setEdit(first)} />}
          <ul className="list">
            <AnimatePresence initial={false} mode="popLayout">
              {(first && first.next >= t ? rest : list).map((s) => <Row key={s.id} s={s} onClick={() => setEdit(s)} />)}
            </AnimatePresence>
          </ul>
          <Button variant="ghost" icon="plus" block onClick={() => setEdit({})}>Додати дату</Button>
        </>
      )}
      <SpecialSheet item={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function yearsLabel(s) {
  if (!s.data.yearly) return null
  const n = Number(s.next.slice(0, 4)) - Number(s.data.date.slice(0, 4))
  if (n <= 0) return null
  const suf = n % 10 === 1 && n % 100 !== 11 ? 'ша' : n % 10 === 2 && n % 100 !== 12 ? 'га' : n % 10 === 3 && n % 100 !== 13 ? 'тя' : 'та'
  const anniv = ['💞', '💍'].includes(s.data.emoji) || /річниц/i.test(s.data.title)
  return anniv ? `${n}-${suf} річниця` : (/народж/i.test(s.data.title) ? `виповнюється ${n}` : `${n}-й рік`)
}

function Hero({ s, onClick }) {
  const d = daysBetween(todayISO(), s.next)
  return (
    <motion.button className="card special-hero" whileTap={{ scale: 0.98 }} onClick={() => { haptic.tap(); onClick() }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <span className="special-hero-emoji">{s.data.emoji || '📅'}</span>
      <p className="eyebrow">Найближча</p>
      <h2 className="h2">{s.data.title}</h2>
      <p className="muted small">{fmtDateFull(s.next)}{yearsLabel(s) ? ` · ${yearsLabel(s)}` : ''}</p>
      <div className="special-count">
        {d === 0 ? <b>Сьогодні! 🎉</b> : <><CountUp value={d} className="special-num" /><span>{d === 1 ? 'день' : d % 10 >= 2 && d % 10 <= 4 && (d < 10 || d > 20) ? 'дні' : 'днів'}</span></>}
      </div>
    </motion.button>
  )
}

function Row({ s, onClick }) {
  const d = daysBetween(todayISO(), s.next)
  const past = d < 0
  return (
    <motion.li layout className={`special ${past ? 'past' : ''}`} onClick={() => { haptic.tap(); onClick() }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={spring}>
      <span className="idea-emoji">{s.data.emoji || '📅'}</span>
      <div className="grow min0">
        <b className="ellipsis">{s.data.title}</b>
        <p className="muted small">{fmtDate(s.next)}{s.data.yearly ? ' · щороку' : ''}</p>
      </div>
      <div className="special-days">
        {past ? <span className="muted small">минуло</span> : d === 0 ? <b>сьогодні</b> : <><b className="tnum">{d}</b><small>дн.</small></>}
      </div>
    </motion.li>
  )
}

function SpecialSheet({ item, onClose }) {
  const { create, update, remove } = useStore()
  const isEdit = !!item?.id
  const [f, setF] = useState({})
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  useEffect(() => { if (item) setF({ title: '', date: todayISO(), yearly: true, remind_days: 3, emoji: '💞', ...(item.data || {}) }) }, [item])
  const save = () => {
    if (!f.title?.trim()) return
    const data = { title: f.title.trim(), date: f.date, yearly: !!f.yearly, remind_days: f.remind_days, emoji: f.emoji }
    haptic.success(); onClose()
    if (isEdit) update(item.id, { data }); else create('special', data)
  }
  return (
    <Sheet open={!!item} onClose={onClose} title={isEdit ? 'Дата' : 'Нова дата'} footer={<div className="row gap">
      {isEdit && <Button variant="danger-ghost" icon="trash" onClick={() => { onClose(); remove(item.id) }} />}
      <Button block onClick={save} disabled={!f.title?.trim()}>Зберегти</Button>
    </div>}>
      <div className="form">
        <div className="emoji-pick">
          {EMOJIS.map((e) => <motion.button key={e} whileTap={{ scale: 0.85 }} className={f.emoji === e ? 'on' : ''} onClick={() => { haptic.select(); set('emoji', e) }}>{e}</motion.button>)}
        </div>
        <Field label="Назва" required><input className="input" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Напр. Наша річниця" /></Field>
        <Field label="Дата"><input type="date" className="input" value={f.date || ''} onChange={(e) => set('date', e.target.value)} /></Field>
        <div className="toggle-row"><div className="grow"><b>Щороку</b><p className="muted small">Відлік до наступної річниці</p></div><Toggle on={!!f.yearly} onChange={(v) => set('yearly', v)} /></div>
        <div className="toggle-row"><div className="grow"><b>Нагадати за</b><p className="muted small">Бот напише о 10:00</p></div><Stepper value={f.remind_days || 0} onChange={(v) => set('remind_days', v)} min={0} max={30} suffix="дн." /></div>
      </div>
    </Sheet>
  )
}
