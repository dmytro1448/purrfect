import { motion } from 'motion/react'
import { useStore } from '../lib/store.jsx'
import { haptic } from '../lib/telegram.js'
import { isoWeek } from '../lib/dates.js'
import Icon from '../components/Icon.jsx'
import { Page, listV, itemV } from '../components/ui.jsx'
import Jar from './more/Jar.jsx'
import DateWheel from './more/DateWheel.jsx'
import Specials from './more/Specials.jsx'
import Album from './more/Album.jsx'
import Checkin from './more/Checkin.jsx'

export default function More({ open, setOpen, openSettings }) {
  const { byKind, myId } = useStore()
  const notes = (byKind.compliment || []).filter((c) => c.data.to === myId && !c.data.opened_at).length
  const checked = (byKind.checkin || []).some((c) => c.data.by === myId && c.data.week === isoWeek())
  const items = [
    { key: 'jar', icon: 'jar', title: 'Банка компліментів', sub: notes ? `${notes} ${notes === 1 ? 'нова записка' : notes < 5 ? 'нові записки' : 'нових записок'}` : 'Теплі записки одне одному', tone: 'pink', badge: notes },
    { key: 'wheel', icon: 'wheel', title: 'Колесо побачень', sub: `${(byKind.idea || []).length} ідей · крутни й ідіть`, tone: 'violet' },
    { key: 'specials', icon: 'calendar', title: 'Важливі дати', sub: 'Річниці, дні народження, відлік', tone: 'amber' },
    { key: 'album', icon: 'photos', title: 'Спільний альбом', sub: `${(byKind.photo || []).length} фото`, tone: 'rose' },
    { key: 'checkin', icon: 'pulse', title: 'Чек-ін тижня', sub: checked ? 'Пройдено цього тижня ✓' : 'Як ми цього тижня?', tone: 'mint', badge: checked ? 0 : '•' },
  ]
  const titles = { jar: 'Банка компліментів', wheel: 'Колесо побачень', specials: 'Важливі дати', album: 'Спільний альбом', checkin: 'Чек-ін тижня' }
  return (
    <div className="stack">
      <div className="screen-head"><h1 className="h1">Ще</h1></div>
      <motion.div className="more-grid" variants={listV} initial="hidden" animate="show">
        {items.map((it, i) => (
          <motion.button key={it.key} variants={itemV} whileTap={{ scale: 0.97 }} className={`more-tile tone-${it.tone} ${i === 0 ? 'wide' : ''}`}
            onClick={() => { haptic.tap(); setOpen(it.key) }}>
            <span className="more-ico"><Icon name={it.icon} size={22} /></span>
            {!!it.badge && <span className={`badge ${it.badge === '•' ? 'badge-dot' : ''}`}>{it.badge === '•' ? '' : it.badge}</span>}
            <span className="more-txt"><b>{it.title}</b><small>{it.sub}</small></span>
          </motion.button>
        ))}
        <motion.button variants={itemV} whileTap={{ scale: 0.97 }} className="card row-card wide" onClick={() => { haptic.tap(); openSettings() }}>
          <div className="row-card-ico"><Icon name="settings" size={20} /></div>
          <div className="grow left"><b>Налаштування</b><p className="muted small">Імена, дата, котик, запрошення</p></div>
          <Icon name="chevronRight" size={18} className="muted" />
        </motion.button>
      </motion.div>

      {Object.entries({ jar: Jar, wheel: DateWheel, specials: Specials, album: Album, checkin: Checkin }).map(([k, C]) => (
        <Page key={k} open={open === k} onClose={() => setOpen(null)} title={titles[k]}>
          <C />
        </Page>
      ))}
    </div>
  )
}
