import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useState } from 'react'
import { useStore, errText } from '../../lib/store.jsx'
import { haptic } from '../../lib/telegram.js'
import { todayISO, fmtDate } from '../../lib/dates.js'
import Icon from '../../components/Icon.jsx'
import { Button, Segmented, spring } from '../../components/ui.jsx'
import { burst } from '../../components/Confetti.jsx'
import { toast } from '../../components/Toast.jsx'

const NOTE_COLORS = ['#FF8AC4', '#FFD1E6', '#C77DFF', '#FF4FA3', '#FFC56B', '#FFB3D9', '#9B4DFF']
const isoOf = (ts) => (ts ? todayISO(new Date(ts)) : null)

export default function Jar() {
  const { byKind, myId, me, call, refetch, create } = useStore()
  const [tab, setTab] = useState('open')
  const [opened, setOpened] = useState(null)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [scope, animateJar] = useAnimate()

  const all = byKind.compliment || []
  const toMe = all.filter((c) => c.data.to === myId)
  const waiting = toMe.filter((c) => !c.data.opened_at)
  const read = toMe.filter((c) => c.data.opened_at).sort((a, b) => (a.data.opened_at < b.data.opened_at ? 1 : -1))
  const fromMe = all.filter((c) => c.created_by === myId && c.data.to !== myId)
  const openedToday = toMe.some((c) => isoOf(c.data.opened_at) === todayISO())
  const partner = me.partner

  const open = async () => {
    if (busy) return
    setBusy(true)
    haptic.medium()
    const shake = animateJar('.jar-svg', { rotate: [0, -6, 6, -5, 5, -2, 0] }, { duration: 0.7 })
    try {
      const [res] = await Promise.all([call('compliment.open'), shake])
      if (!res) { toast('Записок поки немає — попроси партнера написати 💌'); return }
      await animateJar('.jar-lid', { y: -26, rotate: -18, opacity: 0.9 }, { duration: 0.25 })
      haptic.success()
      setOpened(res)
      burst({ kind: 'hearts', y: innerHeight * 0.35 })
      refetch()
      animateJar('.jar-lid', { y: 0, rotate: 0, opacity: 1 }, { delay: 0.6, type: 'spring', stiffness: 300, damping: 18 })
    } catch (e) {
      toast(errText(e), e.message === 'already_opened_today' ? 'info' : 'error')
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    const t = text.trim()
    if (!t || !partner?.tg_id) return
    haptic.success()
    setText('')
    await create('compliment', { text: t, to: partner.tg_id }).catch(() => {})
    burst({ kind: 'hearts', count: 16 })
    toast(`Записку поклали в банку для ${partner.name} 💌`, 'success')
  }

  return (
    <div className="stack">
      <div className="jar-stage" ref={scope}>
        <JarArt count={waiting.length} />
        <AnimatePresence>
          {opened && (
            <motion.div className="note-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpened(null)}>
              <motion.div className="note-card"
                initial={{ y: 120, scale: 0.2, rotate: -20, opacity: 0 }}
                animate={{ y: 0, scale: 1, rotate: -2, opacity: 1 }}
                exit={{ y: -40, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
                <motion.div className="note-unfold" initial={{ scaleY: 0.08 }} animate={{ scaleY: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 20 }}>
                  <Icon name="heart" size={20} fill="currentColor" stroke={0} className="note-heart" />
                  <p className="note-text">{opened.data.text}</p>
                  <p className="note-from">— {partner?.name || 'з любовʼю'}</p>
                </motion.div>
              </motion.div>
              <p className="muted small center" style={{ marginTop: 16 }}>Торкнись, щоб закрити</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="center stack-s">
        <p className="muted small">{waiting.length ? `У банці ${waiting.length} ${waiting.length === 1 ? 'записка' : waiting.length < 5 ? 'записки' : 'записок'} для тебе` : 'Поки що порожньо'}</p>
        <Button onClick={open} loading={busy} disabled={openedToday || !waiting.length} icon={openedToday ? 'clock' : 'sparkles'} block>
          {openedToday ? 'Наступна записка — завтра' : 'Відкрити записку дня'}
        </Button>
      </div>

      <section className="card compose">
        <p className="eyebrow">Нова записка · {partner?.name || 'партнер'}</p>
        <textarea className="input" rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={partner?.tg_id ? 'За що ти вдячний(-а) сьогодні? Що любиш у ній/ньому?' : 'Записки стануть доступні, коли партнер приєднається'} disabled={!partner?.tg_id} />
        <div className="row between">
          <span className="muted small tnum">{text.length}/280</span>
          <Button size="sm" icon="send" onClick={send} disabled={!text.trim() || !partner?.tg_id}>Покласти в банку</Button>
        </div>
      </section>

      <Segmented small value={tab} onChange={setTab} options={[{ value: 'open', label: `Відкриті · ${read.length}` }, { value: 'mine', label: `Від мене · ${fromMe.length}` }]} />
      <ul className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {(tab === 'open' ? read : fromMe).map((c, i) => (
            <motion.li layout key={c.id} className="note-row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}
              style={{ '--nc': NOTE_COLORS[i % NOTE_COLORS.length] }}>
              <p>{c.data.text || 'Записка'}</p>
              <span className="muted small">
                {tab === 'open' ? fmtDate(isoOf(c.data.opened_at)) : c.data.opened_at ? `Прочитано · ${fmtDate(isoOf(c.data.opened_at))}` : 'Чекає в банці'}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {(tab === 'open' ? read : fromMe).length === 0 && <p className="muted small center pad">{tab === 'open' ? 'Тут зʼявляться відкриті записки' : 'Ти ще не писав(ла) записок'}</p>}
      </ul>
    </div>
  )
}

function JarArt({ count }) {
  const notes = Array.from({ length: Math.min(count, 9) })
  return (
    <svg viewBox="0 0 200 220" className="jar-svg" width="190" height="210">
      <defs>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".05" />
          <stop offset=".8" stopColor="#fff" stopOpacity=".03" />
          <stop offset="1" stopColor="#fff" stopOpacity=".14" />
        </linearGradient>
        <linearGradient id="lid" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF8AC4" /><stop offset="1" stopColor="#C8246F" /></linearGradient>
        <clipPath id="jarClip"><path d="M48 62 Q40 72 40 92 V186 Q40 204 60 204 H140 Q160 204 160 186 V92 Q160 72 152 62 Z" /></clipPath>
        <radialGradient id="jglow" cx=".5" cy=".7" r=".6"><stop offset="0" stopColor="#FF4FA3" stopOpacity=".45" /><stop offset="1" stopColor="#FF4FA3" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="100" cy="170" rx="90" ry="50" fill="url(#jglow)" />
      <g clipPath="url(#jarClip)">
        {notes.map((_, i) => {
          const x = 52 + ((i * 37) % 86), y = 186 - Math.floor(i / 3) * 22 - (i % 2) * 6
          return (
            <motion.g key={i} initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 200, damping: 14 }}>
              <rect x={x} y={y - 14} width="30" height="18" rx="4" fill={NOTE_COLORS[i % NOTE_COLORS.length]} transform={`rotate(${(i * 23) % 40 - 20} ${x + 15} ${y - 5})`} />
              <path d={`M${x + 4} ${y - 6} h20`} stroke="#000" strokeOpacity=".15" strokeWidth="2" transform={`rotate(${(i * 23) % 40 - 20} ${x + 15} ${y - 5})`} />
            </motion.g>
          )
        })}
      </g>
      <path d="M48 62 Q40 72 40 92 V186 Q40 204 60 204 H140 Q160 204 160 186 V92 Q160 72 152 62 Z" fill="url(#glass)" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
      <path d="M54 96 V178" stroke="#fff" strokeOpacity=".35" strokeWidth="5" strokeLinecap="round" />
      <rect x="54" y="52" width="92" height="14" rx="5" fill="#2a2030" stroke="rgba(255,255,255,.25)" />
      <g className="jar-lid">
        <rect x="46" y="30" width="108" height="26" rx="9" fill="url(#lid)" />
        <path d="M58 38 h84" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g transform="translate(100 128)">
        <rect x="-30" y="-16" width="60" height="32" rx="8" fill="#0B0A0D" fillOpacity=".55" stroke="rgba(255,255,255,.2)" />
        <path d="M0 8 C -12 0 -8 -10 0 -4 C 8 -10 12 0 0 8Z" fill="#FF4FA3" />
      </g>
    </svg>
  )
}
