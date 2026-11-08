import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { useSignal } from '../../lib/hooks.js'
import { haptic } from '../../lib/telegram.js'
import { addDays, addMonths, nextWeekend, relDay, todayISO, weekday, WD_SHORT, WD_ORDER, WD_FULL, daysBetween } from '../../lib/dates.js'
import Icon from '../../components/Icon.jsx'
import Cat from '../../components/Cat.jsx'
import Sheet from '../../components/Sheet.jsx'
import { Who, useWhoOptions } from '../../components/Who.jsx'
import { Button, Chips, Empty, Field, Segmented, Stepper, Toggle, spring } from '../../components/ui.jsx'
import { burstFrom } from '../../components/Confetti.jsx'
import { toast } from '../../components/Toast.jsx'
import { Check } from './Shop.jsx'

const PLACES = [
  { value: 'Кухня', emoji: '🍳' }, { value: 'Ванна', emoji: '🛁' }, { value: 'Спальня', emoji: '🛏️' }, { value: 'Вітальня', emoji: '🛋️' },
  { value: 'Балкон', emoji: '🪴' }, { value: 'Коридор', emoji: '🚪' }, { value: 'Надворі', emoji: '🌳' },
]
const placeEmoji = (p) => PLACES.find((x) => x.value === p)?.emoji || '📍'
const REACTS = ['❤️', '🔥', '👏', '🥺', '😂', '🌸']

export default function Tasks({ addSignal }) {
  const [sub, setSub] = useState('list')
  const [edit, setEdit] = useState(null)
  const [editRem, setEditRem] = useState(null)
  useSignal(addSignal, () => (sub === 'list' ? setEdit({}) : setEditRem({})))

  return (
    <div className="stack-s">
      <Segmented small value={sub} onChange={setSub} className="seg-sub" options={[{ value: 'list', label: 'Список справ' }, { value: 'rem', label: 'Нагадування' }]} />
      {sub === 'list' ? <TaskList onEdit={setEdit} /> : <Reminders onEdit={setEditRem} />}
      <TaskSheet task={edit} onClose={() => setEdit(null)} />
      <ReminderSheet rem={editRem} onClose={() => setEditRem(null)} />
    </div>
  )
}

function TaskList({ onEdit }) {
  const { byKind, update } = useStore()
  const [showDone, setShowDone] = useState(false)
  const all = byKind.task || []
  const sortDue = (a, b) => (a.data.due || '9999') < (b.data.due || '9999') ? -1 : 1
  const once = all.filter((t) => (t.data.type || 'once') === 'once' && !t.done).sort(sortDue)
  const rec = all.filter((t) => t.data.type && t.data.type !== 'once').sort(sortDue)
  const done = all.filter((t) => t.done)

  const complete = (t, el) => {
    haptic.success()
    burstFrom(el, { count: 36 })
    update(t.id, { done: true }).then(() => {
      if (t.data.type && t.data.type !== 'once') toast('Готово! Наступного разу нагадаю 🐾', 'success')
    }).catch(() => {})
  }

  if (!all.length) return (
    <Empty title="Справ поки немає" text="Розподіліть домашні справи — котик стежитиме, щоб ніхто не забув" action="Додати справу" onAction={() => onEdit({})}>
      <Cat state="idle" size={120} />
    </Empty>
  )
  return (
    <>
      {once.length > 0 && <Group title="Разові" count={once.length}>{once.map((t) => <TaskRow key={t.id} t={t} onDone={complete} onEdit={onEdit} />)}</Group>}
      {rec.length > 0 && <Group title="Повторювані" count={rec.length}>{rec.map((t) => <TaskRow key={t.id} t={t} onDone={complete} onEdit={onEdit} />)}</Group>}
      {done.length > 0 && (
        <div className="done-block">
          <div className="done-head">
            <button className="done-toggle" onClick={() => { haptic.select(); setShowDone((v) => !v) }}>
              <motion.span animate={{ rotate: showDone ? 0 : -90 }}><Icon name="chevronDown" size={16} /></motion.span>
              Виконано · {done.length}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <ul className="list">{done.map((t) => <TaskRow key={t.id} t={t} onDone={() => update(t.id, { done: false })} onEdit={onEdit} />)}</ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

function Group({ title, count, children }) {
  return (
    <section className="group">
      <div className="group-head"><span>{title}</span><span className="group-count">{count}</span></div>
      <ul className="list"><AnimatePresence initial={false} mode="popLayout">{children}</AnimatePresence></ul>
    </section>
  )
}

function recurLabel(d) {
  if (d.type === 'weekly') return `Щотижня · ${WD_SHORT[d.weekday ?? 1].toLowerCase()}`
  if (d.type === 'monthly') return d.every_months > 1 ? `Раз на ${d.every_months} міс.` : 'Щомісяця'
  return null
}

function TaskRow({ t, onDone, onEdit }) {
  const { update, myId } = useStore()
  const [react, setReact] = useState(false)
  const [checking, setChecking] = useState(false)
  const d = t.data
  const overdue = d.due && !t.done && daysBetween(todayISO(), d.due) < 0
  const today = d.due && daysBetween(todayISO(), d.due) === 0
  const reactions = Object.entries(d.reactions || {})
  const toggle = (e) => {
    if (t.done) { onDone(t); return }
    const el = e.currentTarget
    setChecking(true)
    setTimeout(() => { onDone(t, el); setChecking(false) }, 380)
  }
  const setMy = (emo) => {
    haptic.select()
    const r = { ...(d.reactions || {}) }
    if (r[myId] === emo) delete r[myId]
    else r[myId] = emo
    update(t.id, { data: { reactions: r } })
    setReact(false)
  }
  return (
    <motion.li layout className={`task ${t.done ? 'is-done' : ''}`}
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, transition: { duration: 0.22 } }} transition={spring}>
      <div className="task-main" onClick={() => { haptic.tap(); onEdit(t) }}>
        <Check on={t.done || checking} onClick={toggle} />
        <div className="grow min0">
          <div className="strike-wrap task-title">
            <span className={t.done || checking ? 'dim' : ''}>{d.title}</span>
            <motion.span className="strike" initial={false} animate={{ scaleX: t.done || checking ? 1 : 0 }} transition={{ duration: 0.3 }} />
          </div>
          <div className="task-meta">
            {d.place && <span className="tag">{placeEmoji(d.place)} {d.place}</span>}
            {recurLabel(d) && <span className="tag tag-violet"><Icon name="repeat" size={11} />{recurLabel(d)}</span>}
            {d.due && <span className={`tag ${overdue ? 'tag-danger' : today ? 'tag-pink' : ''}`}><Icon name="clock" size={11} />{relDay(d.due)}</span>}
            {d.remind_days > 0 && <span className="tag"><Icon name="bell" size={11} />за {d.remind_days} дн.</span>}
          </div>
        </div>
        <Who who={d.who} size={24} />
      </div>
      <div className="task-foot">
        {reactions.map(([uid, e]) => <motion.span key={uid} className={`react ${Number(uid) === myId ? 'mine' : ''}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>{e}</motion.span>)}
        <button className="react-add" onClick={() => { haptic.tap(); setReact((v) => !v) }} aria-label="Реакція">
          <Icon name={react ? 'x' : 'heart'} size={13} />
        </button>
        <AnimatePresence>
          {react && (
            <motion.div className="react-strip" initial={{ opacity: 0, x: -8, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -8, scale: 0.9 }} transition={spring}>
              {REACTS.map((e) => <motion.button key={e} whileTap={{ scale: 1.4 }} onClick={() => setMy(e)}>{e}</motion.button>)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}

// ---------------------------------------------------------------- шит справи
const WHEN = [
  { value: 'none', label: 'Без терміну' }, { value: 'today', label: 'Сьогодні' }, { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'На вихідних' }, { value: 'pick', label: 'Обрати дату', icon: 'calendar' },
]

function nextWeekday(wd) {
  let d = todayISO()
  while (weekday(d) !== wd) d = addDays(d, 1)
  return d
}
function nextMonthDay(day) {
  const t = todayISO()
  const cand = addMonths(t, 0, day)
  return cand >= t ? cand : addMonths(t, 1, day)
}

function TaskSheet({ task, onClose }) {
  const { create, update, remove, myId } = useStore()
  const whoOpts = useWhoOptions()
  const open = !!task
  const isEdit = !!task?.id
  const [f, setF] = useState({})
  const [customPlace, setCustomPlace] = useState(false)
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))

  useEffect(() => {
    if (!task) return
    const d = task.data || {}
    const due = d.due
    const when = !due ? 'none' : due === todayISO() ? 'today' : due === addDays(todayISO(), 1) ? 'tomorrow' : 'pick'
    setF({ title: d.title || '', place: d.place || null, who: d.who ?? 'both', type: d.type || 'once', weekday: d.weekday ?? weekday(todayISO()),
      every_months: d.every_months || 1, month_day: d.month_day || Number(todayISO().slice(8)), when, date: due || addDays(todayISO(), 2),
      remind: (d.remind_days ?? 0) > 0, remind_days: d.remind_days || 1 })
    setCustomPlace(!!d.place && !PLACES.some((p) => p.value === d.place))
  }, [task])

  const save = async () => {
    if (!f.title?.trim()) { haptic.error(); return }
    let due = null
    if (f.type === 'once') due = { none: null, today: todayISO(), tomorrow: addDays(todayISO(), 1), weekend: nextWeekend(), pick: f.date }[f.when]
    if (f.type === 'weekly') due = nextWeekday(f.weekday)
    if (f.type === 'monthly') due = nextMonthDay(f.month_day)
    const data = {
      title: f.title.trim(), place: f.place || null, who: f.who, type: f.type, due,
      weekday: f.type === 'weekly' ? f.weekday : null, every_months: f.type === 'monthly' ? f.every_months : null, month_day: f.type === 'monthly' ? f.month_day : null,
      remind_days: due && f.remind ? f.remind_days : null,
    }
    onClose()
    haptic.success()
    if (isEdit) update(task.id, { data })
    else {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null))
      create('task', clean)
    }
  }
  void myId

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Справа' : 'Нова справа'}
      footer={<div className="row gap">
        {isEdit && <Button variant="danger-ghost" icon="trash" onClick={() => { onClose(); remove(task.id) }} />}
        <Button block onClick={save} disabled={!f.title?.trim()}>{isEdit ? 'Зберегти' : 'Додати справу'}</Button>
      </div>}>
      <div className="form">
        <Field label="Що зробити" required>
          <input className="input" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Напр. помити посуд" autoFocus={!isEdit} />
        </Field>
        <Field label="Де">
          <Chips value={customPlace ? '__custom' : f.place} onChange={(v) => { if (v === '__custom') { setCustomPlace(true); set('place', '') } else { setCustomPlace(false); set('place', v) } }}
            options={[...PLACES.map((p) => ({ ...p, label: p.value, toggle: true })), { value: '__custom', label: 'Свій варіант', icon: 'edit' }]} />
          <AnimatePresence>
            {customPlace && (
              <motion.input className="input mt-s" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 48 }} exit={{ opacity: 0, height: 0 }}
                value={f.place || ''} onChange={(e) => set('place', e.target.value)} placeholder="Напр. Гараж" autoFocus />
            )}
          </AnimatePresence>
        </Field>
        <Field label="Хто">
          <Chips value={f.who} onChange={(v) => set('who', v)} options={whoOpts} />
        </Field>
        <Field label="Тип">
          <Segmented small value={f.type} onChange={(v) => set('type', v)} options={[{ value: 'once', label: 'Разове' }, { value: 'weekly', label: 'Щотижня' }, { value: 'monthly', label: 'Раз на N міс.' }]} />
        </Field>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={f.type} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {f.type === 'once' && (
              <Field label="Коли">
                <Chips value={f.when} onChange={(v) => set('when', v)} options={WHEN} />
                {f.when === 'pick' && <input type="date" className="input mt-s" value={f.date} min={todayISO()} onChange={(e) => set('date', e.target.value)} />}
              </Field>
            )}
            {f.type === 'weekly' && (
              <Field label="День тижня" hint={`Наступного разу: ${WD_FULL[f.weekday]}, ${relDay(nextWeekday(f.weekday)).toLowerCase()}`}>
                <div className="wd-row">
                  {WD_ORDER.map((d) => (
                    <motion.button key={d} type="button" whileTap={{ scale: 0.9 }} className={`wd ${f.weekday === d ? 'on' : ''}`} onClick={() => { haptic.select(); set('weekday', d) }}>{WD_SHORT[d]}</motion.button>
                  ))}
                </div>
              </Field>
            )}
            {f.type === 'monthly' && (
              <div className="row gap">
                <Field label="Кожні"><Stepper value={f.every_months} onChange={(v) => set('every_months', v)} min={1} max={12} suffix="міс." /></Field>
                <Field label="Число"><Stepper value={f.month_day} onChange={(v) => set('month_day', v)} min={1} max={31} /></Field>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {(f.type !== 'once' || f.when !== 'none') && (
          <div className="toggle-row">
            <div className="grow">
              <b>Нагадати заздалегідь</b>
              <p className="muted small">Бот напише о 10:00 {f.remind ? `за ${f.remind_days} дн.` : 'в день справи'}</p>
            </div>
            {f.remind && <Stepper value={f.remind_days} onChange={(v) => set('remind_days', v)} min={1} max={14} />}
            <Toggle on={!!f.remind} onChange={(v) => set('remind', v)} label="Нагадати" />
          </div>
        )}
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------- нагадування
function daysLabel(days) {
  if (!days?.length || days.length === 7) return 'Щодня'
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Будні'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Вихідні'
  return WD_ORDER.filter((d) => days.includes(d)).map((d) => WD_SHORT[d]).join(', ')
}

function Reminders({ onEdit }) {
  const { byKind, update } = useStore()
  const list = (byKind.reminder || []).slice().sort((a, b) => (a.data.time < b.data.time ? -1 : 1))
  return (
    <>
      <p className="muted small hint-text">Щоденні чи по днях тижня — бот напише в Telegram у вибраний час.</p>
      {!list.length ? (
        <Empty title="Нагадувань немає" text="Вітамінки, квіти, дзвінок мамі — котик нагадає" action="Нагадування" onAction={() => onEdit({})}>
          <Cat state="sleep" size={110} />
        </Empty>
      ) : (
        <ul className="list">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((r) => (
              <motion.li layout key={r.id} className={`rem ${r.data.enabled ? '' : 'off'}`} onClick={() => { haptic.tap(); onEdit(r) }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={spring}>
                <div className="rem-ico"><Icon name="bell" size={18} /></div>
                <div className="grow min0">
                  <b className="ellipsis">{r.data.title}</b>
                  <p className="muted small">{daysLabel(r.data.days)} · <span className="tnum">{r.data.time}</span></p>
                </div>
                <Who who={r.data.who} size={22} />
                <Toggle on={!!r.data.enabled} onChange={(v) => update(r.id, { data: { enabled: v } })} label="Увімкнено" />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  )
}

function ReminderSheet({ rem, onClose }) {
  const { create, update, remove } = useStore()
  const whoOpts = useWhoOptions()
  const isEdit = !!rem?.id
  const [f, setF] = useState({})
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  useEffect(() => {
    if (rem) setF({ title: '', time: '09:00', days: [], who: 'both', enabled: true, ...(rem.data || {}) })
  }, [rem])
  const save = () => {
    if (!f.title?.trim()) return
    const data = { title: f.title.trim(), time: f.time, days: f.days, who: f.who, enabled: f.enabled }
    onClose(); haptic.success()
    if (isEdit) update(rem.id, { data })
    else create('reminder', data)
  }
  return (
    <Sheet open={!!rem} onClose={onClose} title={isEdit ? 'Нагадування' : 'Нове нагадування'}
      footer={<div className="row gap">
        {isEdit && <Button variant="danger-ghost" icon="trash" onClick={() => { onClose(); remove(rem.id) }} />}
        <Button block onClick={save} disabled={!f.title?.trim()}>{isEdit ? 'Зберегти' : 'Створити'}</Button>
      </div>}>
      <div className="form">
        <Field label="Про що нагадати" required>
          <input className="input" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Напр. випити вітамінки" />
        </Field>
        <Field label="Час">
          <input type="time" className="input input-time" value={f.time || '09:00'} onChange={(e) => set('time', e.target.value)} />
        </Field>
        <Field label="Дні" hint={f.days?.length ? daysLabel(f.days) : 'Нічого не вибрано — нагадуватиме щодня'}>
          <div className="wd-row">
            {WD_ORDER.map((d) => {
              const on = f.days?.includes(d)
              return <motion.button key={d} type="button" whileTap={{ scale: 0.9 }} className={`wd ${on ? 'on' : ''}`}
                onClick={() => { haptic.select(); set('days', on ? f.days.filter((x) => x !== d) : [...(f.days || []), d]) }}>{WD_SHORT[d]}</motion.button>
            })}
          </div>
        </Field>
        <Field label="Кому"><Chips value={f.who} onChange={(v) => set('who', v)} options={whoOpts.map((o) => (o.value === 'both' ? { ...o, label: 'Обом' } : o.label === 'Я' ? { ...o, label: 'Мені' } : o))} /></Field>
        <div className="toggle-row"><div className="grow"><b>Увімкнено</b></div><Toggle on={!!f.enabled} onChange={(v) => set('enabled', v)} /></div>
      </div>
    </Sheet>
  )
}
