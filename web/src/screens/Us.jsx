// Головна «Ми»: картка пари, котик, найближча дата, банка, чек-ін
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, errText } from '../lib/store.jsx'
import { api, isMock } from '../api/index.js'
import { haptic, shareLink } from '../lib/telegram.js'
import { daysBetween, fmtDateFull, todayISO, nextOccurrence, isNight, isoWeek, pl, plural, DAYS, fmtDate } from '../lib/dates.js'
import { Avatar, Bar, Button, CountUp, listV, itemV, spring } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import Cat from '../components/Cat.jsx'
import { burst, burstFrom } from '../components/Confetti.jsx'
import { toast } from '../components/Toast.jsx'

export default function Us({ go, openMore }) {
  const { me, byKind } = useStore()
  const { couple, member, partner } = me
  const days = Math.max(0, daysBetween(couple.started_at, todayISO()))
  const dates = (byKind.date || []).filter((d) => d.data.kind !== 'trip').length
  const trips = (byKind.date || []).filter((d) => d.data.kind === 'trip').length

  return (
    <motion.div variants={listV} initial="hidden" animate="show" className="stack">
      <motion.section variants={itemV} className="card couple-card">
        <div className="couple-avs">
          <Avatar member={member} size={76} ring />
          <motion.div className="couple-heart" animate={{ scale: [1, 1.22, 1, 1.14, 1] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.9 }}>
            <Icon name="heart" size={18} fill="currentColor" stroke={0} />
          </motion.div>
          <Avatar member={partner || { name: '?' }} size={76} ring />
        </div>
        <h1 className="couple-name">{couple.name}</h1>
        <p className="couple-names">{member.name} & {partner?.name || '…'}</p>
        <div className="pill-soft"><Icon name="calendar" size={14} />Разом з {fmtDateFull(couple.started_at)}</div>
        <div className="stats">
          <motion.div className="stat stat-main" whileTap={{ scale: 0.97 }}>
            <CountUp value={days} className="stat-num" />
            <span className="stat-lbl">{plural(days, DAYS)}</span>
          </motion.div>
          <motion.button className="stat" whileTap={{ scale: 0.97 }} onClick={() => go('places')}>
            <CountUp value={dates} className="stat-num" />
            <span className="stat-lbl">побачень</span>
            <Icon name="heart" size={12} className="stat-ico" />
          </motion.button>
          <motion.button className="stat" whileTap={{ scale: 0.97 }} onClick={() => go('places')}>
            <CountUp value={trips} className="stat-num" />
            <span className="stat-lbl">{trips === 1 ? 'поїздка' : trips > 1 && trips < 5 ? 'поїздки' : 'поїздок'}</span>
            <Icon name="plane" size={12} className="stat-ico" />
          </motion.button>
        </div>
      </motion.section>

      {partner?.pending && <motion.div variants={itemV}><InviteCard /></motion.div>}

      <motion.div variants={itemV}><PetCard /></motion.div>
      <motion.div variants={itemV}><NextDate onOpen={() => openMore('specials')} /></motion.div>
      <motion.div variants={itemV}><JarTeaser onOpen={() => openMore('jar')} /></motion.div>
      <motion.div variants={itemV}><CheckinTeaser onOpen={() => openMore('checkin')} /></motion.div>
    </motion.div>
  )
}

export function InviteCard() {
  const { me, setMe } = useStore()
  const link = me.invite_link
  const name = me.partner?.name || 'партнера'
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); haptic.success(); toast('Посилання скопійовано', 'success') } catch { toast('Не вдалося скопіювати', 'error') }
  }
  return (
    <section className="card invite-card">
      <div className="invite-glow" />
      <div className="row gap-s">
        <div className="invite-ico"><Icon name="send" size={20} /></div>
        <div className="grow">
          <h3 className="h3">Запрошення для: {name}</h3>
          <p className="muted small">Надішли посилання — і все стане спільним: справи, вішліст, котик.</p>
        </div>
      </div>
      <div className="invite-link">{link?.replace('https://', '')}</div>
      <div className="row gap">
        <Button variant="ghost" icon="copy" block onClick={copy}>Копіювати</Button>
        <Button icon="share" block onClick={() => shareLink(link, `Приєднуйся до нашої пари в Purrfect 💗`)}>Поділитися</Button>
      </div>
      {isMock && (
        <button className="link-btn small" style={{ marginTop: 10 }} onClick={async () => { setMe(await api.call('mock.partner_join')); burst({ kind: 'hearts' }) }}>
          Демо: {name} приєднується
        </button>
      )}
    </section>
  )
}

const PHRASES = {
  sleep: 'Тссс… котик спить',
  sad: 'Мур… я зголоднів',
  happy: 'Мрр, дякую!',
  purr: 'Муррр-муррр 💗',
  eat: 'Ням-ням!',
  play: 'Ще-ще!',
}

function PetCard() {
  const { me, setCat } = useStore()
  const cat = me.couple.cat
  const [temp, setTemp] = useState(null)
  const [busy, setBusy] = useState(null)
  const [night, setNight] = useState(isNight())
  const timer = useRef()
  const card = useRef()
  useEffect(() => { const i = setInterval(() => setNight(isNight()), 60e3); return () => clearInterval(i) }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const base = cat.hunger < 25 ? 'sad' : night ? 'sleep' : 'idle'
  const state = temp || base
  const lvlFrom = cat.level_xp ?? (cat.level - 1) ** 2 * 20
  const lvlTo = cat.next_level_xp ?? cat.level ** 2 * 20

  const act = async (action) => {
    if (busy) return
    setBusy(action)
    haptic.medium()
    const show = { feed: 'eat', pet: 'purr', play: 'play' }[action]
    setTemp(show)
    clearTimeout(timer.current)
    try {
      const prevLevel = cat.level
      const next = await api.call('pet.action', { action })
      setCat(next)
      haptic.success()
      if (action === 'pet') burstFrom(card.current?.querySelector('.cat'), { kind: 'hearts', count: 10 })
      if (next.level > prevLevel) {
        setTimeout(() => { burst({}); toast(`Новий рівень: ${next.level_title}! 🎉`, 'success') }, 500)
      }
      timer.current = setTimeout(() => { setTemp('happy'); timer.current = setTimeout(() => setTemp(null), 1400) }, 1700)
    } catch (e) {
      setTemp(null)
      toast(errText(e), e.message === 'not_hungry' ? 'info' : 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card pet-card" ref={card}>
      <div className="pet-head">
        <div>
          <div className="row gap-s">
            <h2 className="h2">{cat.name}</h2>
            {cat.streak > 0 && (
              <span className="streak"><Icon name="flame" size={13} />{pl(cat.streak, DAYS)}</span>
            )}
          </div>
          <p className="muted small">{cat.level_title} · рівень {cat.level}</p>
        </div>
        <div className="lvl-badge"><span>{cat.level}</span><small>рів.</small></div>
      </div>

      <div className={`pet-scene ${night ? 'night' : ''}`}>
        <div className="pet-scene-sky" />
        {night && <div className="stars-bg" />}
        <AnimatePresence mode="wait">
          {PHRASES[state] && (
            <motion.div key={state} className="pet-bubble" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }} transition={spring}>
              {PHRASES[state]}
            </motion.div>
          )}
        </AnimatePresence>
        {cat.hunger < 25 && <span className="pet-tag"><Icon name="fish" size={12} />Чекає їжі</span>}
        <motion.div className="pet-cat" onClick={() => act('pet')} whileTap={{ scale: 0.97 }}>
          <Cat state={state} size={210} />
        </motion.div>
      </div>

      <div className="pet-xp">
        <div className="row between small"><span className="muted">Досвід</span><span><b>{cat.xp - lvlFrom}</b><span className="muted"> / {lvlTo - lvlFrom} XP</span></span></div>
        <Bar value={cat.xp - lvlFrom} max={lvlTo - lvlFrom} tone="grad" />
      </div>
      <div className="pet-meters">
        <Meter icon="fish" label="Ситість" value={cat.hunger} tone={cat.hunger < 25 ? 'warn' : 'pink'} />
        <Meter icon="heart" label="Настрій" value={cat.mood} tone="violet" />
      </div>
      <div className="pet-actions">
        <PetBtn icon="fish" label="Погодувати" onClick={() => act('feed')} busy={busy === 'feed'} hot={cat.hunger < 40} />
        <PetBtn icon="hand" label="Погладити" onClick={() => act('pet')} busy={busy === 'pet'} />
        <PetBtn icon="yarn" label="Пограти" onClick={() => act('play')} busy={busy === 'play'} />
      </div>
    </section>
  )
}

function Meter({ icon, label, value, tone }) {
  return (
    <div className="meter">
      <div className="row between small"><span className="row gap-xs muted"><Icon name={icon} size={13} />{label}</span><b>{value}%</b></div>
      <Bar value={value} tone={tone} />
    </div>
  )
}
function PetBtn({ icon, label, onClick, busy, hot }) {
  return (
    <motion.button className={`pet-btn ${hot ? 'hot' : ''}`} whileTap={{ scale: 0.94 }} transition={spring} onClick={onClick}>
      <span className="pet-btn-ico">{busy ? <span className="spinner" /> : <Icon name={icon} size={20} />}</span>
      <span>{label}</span>
    </motion.button>
  )
}

function NextDate({ onOpen }) {
  const { byKind } = useStore()
  const next = useMemo(() => {
    const t = todayISO()
    return (byKind.special || []).map((s) => ({ ...s, next: nextOccurrence(s.data.date, s.data.yearly) }))
      .filter((s) => s.next >= t).sort((a, b) => (a.next < b.next ? -1 : 1))[0]
  }, [byKind.special])
  if (!next) return (
    <motion.button className="card row-card" whileTap={{ scale: 0.98 }} onClick={onOpen}>
      <div className="row-card-ico"><Icon name="calendar" size={20} /></div>
      <div className="grow"><b>Важливі дати</b><p className="muted small">Додайте річницю чи день народження</p></div>
      <Icon name="chevronRight" size={18} className="muted" />
    </motion.button>
  )
  const d = daysBetween(todayISO(), next.next)
  return (
    <motion.button className="card date-teaser" whileTap={{ scale: 0.98 }} onClick={onOpen}>
      <div className="date-emoji">{next.data.emoji || '📅'}</div>
      <div className="grow left">
        <p className="eyebrow">Найближча дата</p>
        <b className="date-title">{next.data.title}</b>
        <p className="muted small">{fmtDate(next.next)}</p>
      </div>
      <div className="countdown">
        {d === 0 ? <b className="cd-today">Сьогодні!</b> : <><CountUp value={d} className="cd-num" /><span>{d === 1 ? 'день' : d < 5 ? 'дні' : 'днів'}</span></>}
      </div>
    </motion.button>
  )
}

function JarTeaser({ onOpen }) {
  const { byKind, myId } = useStore()
  const waiting = (byKind.compliment || []).filter((c) => c.data.to === myId && !c.data.opened_at).length
  return (
    <motion.button className="card jar-teaser" whileTap={{ scale: 0.98 }} onClick={onOpen}>
      <div className="jar-mini">
        <Icon name="jar" size={30} stroke={1.6} />
        {waiting > 0 && <span className="badge">{waiting}</span>}
      </div>
      <div className="grow left">
        <b>Банка компліментів</b>
        <p className="muted small">{waiting ? `На тебе чекає ${waiting} ${waiting === 1 ? 'записка' : waiting < 5 ? 'записки' : 'записок'}` : 'Напиши щось тепле — партнер відкриє'}</p>
      </div>
      <Icon name="chevronRight" size={18} className="muted" />
    </motion.button>
  )
}

function CheckinTeaser({ onOpen }) {
  const { byKind, myId } = useStore()
  const done = (byKind.checkin || []).some((c) => c.data.by === myId && c.data.week === isoWeek())
  if (done) return null
  return (
    <motion.button className="card checkin-teaser" whileTap={{ scale: 0.98 }} onClick={onOpen}>
      <div className="row-card-ico pulse"><Icon name="pulse" size={20} /></div>
      <div className="grow left">
        <b>Чек-ін тижня</b>
        <p className="muted small">2 хвилини, щоб почути одне одного</p>
      </div>
      <span className="pill-cta">Пройти</span>
    </motion.button>
  )
}
