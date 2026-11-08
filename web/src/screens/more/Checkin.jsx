import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { haptic } from '../../lib/telegram.js'
import { isoWeek, weekRange } from '../../lib/dates.js'
import Icon from '../../components/Icon.jsx'
import { Avatar, Bar, Button, spring } from '../../components/ui.jsx'
import { burst } from '../../components/Confetti.jsx'

export const QUESTIONS = [
  { id: 'heard', q: 'Наскільки тебе чули цього тижня?', short: 'Почутість' },
  { id: 'support', q: 'Чи вистачало тобі підтримки?', short: 'Підтримка' },
  { id: 'close', q: 'Наскільки ви були емоційно близькі?', short: 'Близькість' },
  { id: 'time', q: 'Як тобі якість часу разом?', short: 'Час разом' },
  { id: 'week', q: 'Наскільки тобі сподобався цей тиждень?', short: 'Тиждень' },
]
const FACES = ['😞', '😕', '😐', '🙂', '😍']

export default function Checkin() {
  const { byKind, myId } = useStore()
  const week = isoWeek()
  const all = byKind.checkin || []
  const mine = all.find((c) => c.data.by === myId && c.data.week === week)
  const [redo, setRedo] = useState(false)
  return (
    <div className="stack">
      <AnimatePresence mode="wait">
        {!mine || redo
          ? <motion.div key="q" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Quiz week={week} prev={mine} onDone={() => setRedo(false)} /></motion.div>
          : <motion.div key="r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Result week={week} onRedo={() => setRedo(true)} /></motion.div>}
      </AnimatePresence>
      <History />
    </div>
  )
}

function Quiz({ week, prev, onDone }) {
  const { create, myId, refetch } = useStore()
  const [step, setStep] = useState(0)
  const [ans, setAns] = useState(prev?.data.answers || {})
  const [note, setNote] = useState(prev?.data.note || '')
  const [dir, setDir] = useState(1)
  const total = QUESTIONS.length + 1
  const go = (d) => { setDir(d); setStep((s) => Math.max(0, Math.min(total - 1, s + d))) }
  const choose = (id, v) => {
    haptic.select()
    setAns((a) => ({ ...a, [id]: v }))
    setTimeout(() => go(1), 260)
  }
  const submit = async () => {
    haptic.success()
    burst({})
    await create('checkin', { week, by: myId, answers: ans, ...(note.trim() ? { note: note.trim() } : {}) }).catch(() => {})
    onDone()
    refetch()
  }
  const q = QUESTIONS[step]
  return (
    <section className="card quiz">
      <div className="row between">
        <p className="eyebrow">Тиждень {weekRange(week)}</p>
        <span className="muted small tnum">{Math.min(step + 1, total)}/{total}</span>
      </div>
      <Bar value={step + (q ? 0 : 1)} max={total} tone="grad" />
      <div className="quiz-stage">
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div key={step} custom={dir} className="quiz-q"
            variants={{ in: (d) => ({ x: d * 60, opacity: 0 }), c: { x: 0, opacity: 1 }, out: (d) => ({ x: d * -60, opacity: 0 }) }}
            initial="in" animate="c" exit="out" transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            {q ? (
              <>
                <h3 className="quiz-title">{q.q}</h3>
                <div className="faces">
                  {FACES.map((f, i) => {
                    const v = i + 1, on = ans[q.id] === v
                    return (
                      <motion.button key={v} className={`face ${on ? 'on' : ''}`} whileTap={{ scale: 0.85 }} animate={on ? { scale: [1, 1.2, 1.08] } : { scale: 1 }} onClick={() => choose(q.id, v)}>
                        <span>{f}</span><small>{v}</small>
                      </motion.button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <h3 className="quiz-title">Щось хочеш додати?</h3>
                <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Що було найкращим? Чого хочеться більше?" />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="row gap">
        {step > 0 && <Button variant="ghost" icon="chevronLeft" onClick={() => go(-1)} />}
        {q ? <Button block variant="ghost" onClick={() => go(1)} disabled={!ans[q.id]}>Далі</Button>
          : <Button block icon="check" onClick={submit} disabled={QUESTIONS.some((x) => !ans[x.id])}>Готово</Button>}
      </div>
    </section>
  )
}

const avg = (a) => { const v = Object.values(a || {}); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0 }

function Result({ week, onRedo }) {
  const { byKind, myId, me } = useStore()
  const all = byKind.checkin || []
  const mine = all.find((c) => c.data.by === myId && c.data.week === week)
  const theirs = all.find((c) => c.data.by !== myId && c.data.week === week)
  const pa = theirs && !theirs.data.hidden ? theirs.data.answers : null
  const gap = pa && QUESTIONS.map((q) => ({ q, d: Math.abs((mine.data.answers[q.id] || 0) - (pa[q.id] || 0)) })).sort((a, b) => b.d - a.d)[0]
  const low = QUESTIONS.map((q) => ({ q, v: Math.min(mine.data.answers[q.id] || 5, pa?.[q.id] ?? 5) })).sort((a, b) => a.v - b.v)[0]
  return (
    <section className="card result">
      <div className="row between">
        <div><p className="eyebrow">Цей тиждень</p><h3 className="h3">Наш пульс</h3></div>
        <button className="link-btn small" onClick={onRedo}>Змінити</button>
      </div>
      <div className="result-avgs">
        <div><Avatar member={me.member} size={36} /><b className="tnum">{avg(mine.data.answers).toFixed(1)}</b><small>ти</small></div>
        <div className="result-heart"><Icon name="heart" size={18} fill="currentColor" stroke={0} /></div>
        <div><Avatar member={me.partner || { name: '?' }} size={36} /><b className="tnum">{pa ? avg(pa).toFixed(1) : '—'}</b><small>{me.partner?.name || 'партнер'}</small></div>
      </div>
      <div className="cmp">
        {QUESTIONS.map((q, i) => (
          <motion.div key={q.id} className="cmp-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.05 }}>
            <span className="cmp-lbl">{q.short}</span>
            <div className="cmp-bars">
              <Bar value={mine.data.answers[q.id] || 0} max={5} tone="pink" />
              {pa ? <Bar value={pa[q.id] || 0} max={5} tone="violet" /> : <div className="bar bar-empty" />}
            </div>
            <span className="cmp-v tnum">{mine.data.answers[q.id]}{pa ? ` · ${pa[q.id]}` : ''}</span>
          </motion.div>
        ))}
      </div>
      {!pa ? (
        <div className="waiting">
          <Icon name="clock" size={16} />
          <span>{theirs ? `${me.partner?.name} вже відповідає — оновлюємо…` : `Чекаємо на ${me.partner?.name || 'партнера'} — порівняння зʼявиться, щойно буде готово`}</span>
        </div>
      ) : gap && gap.d >= 2 ? (
        <div className="insight"><Icon name="info" size={16} /><span>Найбільша різниця — <b>{gap.q.short.toLowerCase()}</b>. Гарна тема для теплої розмови ☕</span></div>
      ) : (
        <div className="insight"><Icon name="heart" size={16} /><span>Ви на одній хвилі{low && low.v <= 3 ? `. Можна трохи підтягнути: ${low.q.short.toLowerCase()}` : ' 💞'}</span></div>
      )}
      {mine.data.note && <p className="note">Ти: {mine.data.note}</p>}
      {pa && theirs.data.note && <p className="note note-v">{me.partner?.name}: {theirs.data.note}</p>}
    </section>
  )
}

function History() {
  const { byKind, myId, me } = useStore()
  const cur = isoWeek()
  const weeks = useMemo(() => {
    const m = {}
    for (const c of byKind.checkin || []) {
      if (c.data.week === cur) continue
      m[c.data.week] ||= {}
      m[c.data.week][c.data.by === myId ? 'me' : 'p'] = c.data.hidden ? null : c.data.answers
    }
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12)
  }, [byKind.checkin, myId, cur])
  if (!weeks.length) return null
  return (
    <section className="stack-s">
      <div className="row between"><h3 className="section-h">Історія</h3><span className="hist-legend"><i className="me" />ти <i className="p" />{me.partner?.name || 'партнер'}</span></div>
      <ul className="list">
        {weeks.map(([w, v]) => (
          <li key={w} className="hist">
            <div className="grow"><b>{weekRange(w)}</b><p className="muted small">{w.replace('-W', ' · тиждень ')}</p></div>
            <span className="hist-v me tnum">{v.me ? avg(v.me).toFixed(1) : '—'}</span>
            <span className="hist-v p tnum">{v.p ? avg(v.p).toFixed(1) : '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
