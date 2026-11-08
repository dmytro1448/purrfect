import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { DataProvider, useStore } from './lib/store.jsx'
import { haptic } from './lib/telegram.js'
import Icon from './components/Icon.jsx'
import Toaster from './components/Toast.jsx'
import Confetti from './components/Confetti.jsx'
import { Avatar, Skeleton, IconButton, Button } from './components/ui.jsx'
import Logo from './components/Logo.jsx'
import Us from './screens/Us.jsx'
import House from './screens/House.jsx'
import Wishlist from './screens/Wishlist.jsx'
import Places from './screens/Places.jsx'
import More from './screens/More.jsx'
import Settings from './screens/Settings.jsx'
import Onboarding from './screens/Onboarding.jsx'

const TABS = [
  { id: 'places', label: 'Місця', icon: 'pin' },
  { id: 'house', label: 'Дім', icon: 'home' },
  { id: 'us', label: 'Ми', icon: 'heart' },
  { id: 'wish', label: 'Вішліст', icon: 'sparkles' },
  { id: 'more', label: 'Ще', icon: 'dots' },
]

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <DataProvider>
        <Backdrop />
        <Shell />
        <Toaster />
        <Confetti />
      </DataProvider>
    </MotionConfig>
  )
}

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <div className="grain" />
    </div>
  )
}

function Shell() {
  const { me, loading, error, refetch } = useStore()
  if (loading) return <Loading />
  if (error && !me) return (
    <div className="center-screen">
      <Logo size={30} />
      <p className="muted">Не вдалося підʼєднатися. Перевір інтернет.</p>
      <Button onClick={refetch} icon="refresh">Спробувати ще</Button>
    </div>
  )
  if (!me?.couple) return <Onboarding />
  return <Main />
}

function Loading() {
  return (
    <div className="app">
      <div className="topbar"><Logo /></div>
      <div className="screen" style={{ paddingTop: 12 }}>
        <Skeleton h={260} r={28} />
        <Skeleton h={340} r={28} style={{ marginTop: 14 }} />
        <Skeleton h={90} r={22} style={{ marginTop: 14 }} />
      </div>
    </div>
  )
}

function Main() {
  const { me } = useStore()
  const [tab, setTab] = useState(() => sessionStorage.getItem('tab') || 'us')
  const [dir, setDir] = useState(0)
  const [settings, setSettings] = useState(false)
  const [moreOpen, setMoreOpen] = useState(null)

  useEffect(() => { try { sessionStorage.setItem('tab', tab) } catch { /* */ } }, [tab])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [tab])

  const go = (id) => {
    if (id === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const a = TABS.findIndex((t) => t.id === tab), b = TABS.findIndex((t) => t.id === id)
    setDir(b > a ? 1 : -1)
    haptic.select()
    if (id !== 'more') setMoreOpen(null)
    setTab(id)
  }
  const openMore = (key) => { go('more'); setTimeout(() => setMoreOpen(key), 60) }

  const screen = {
    us: <Us go={go} openMore={openMore} openSettings={() => setSettings(true)} />,
    house: <House />,
    wish: <Wishlist />,
    places: <Places />,
    more: <More open={moreOpen} setOpen={setMoreOpen} openSettings={() => setSettings(true)} />,
  }[tab]

  return (
    <div className="app">
      <header className="topbar">
        <Logo />
        <div className="topbar-right">
          <div className="av-pair" onClick={() => go('us')}>
            <Avatar member={me.member} size={34} ring />
            {me.partner && <Avatar member={me.partner} size={34} ring />}
          </div>
          <IconButton icon="settings" label="Налаштування" onClick={() => setSettings(true)} />
        </div>
      </header>

      <main className="screen-wrap">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div key={tab} className="screen" custom={dir}
            variants={{
              enter: (d) => ({ x: d * 56, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d) => ({ x: d * -56, opacity: 0 }),
            }}
            initial="enter" animate="center" exit="exit"
            transition={{ x: { type: 'spring', stiffness: 420, damping: 40 }, opacity: { duration: 0.18 } }}>
            {screen}
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar tab={tab} go={go} />
      <Settings open={settings} onClose={() => setSettings(false)} />
    </div>
  )
}

function TabBar({ tab, go }) {
  return (
    <nav className="tabbar">
      <div className="tabbar-in">
        {TABS.map((t) => {
          const active = t.id === tab
          if (t.id === 'us') return (
            <button key={t.id} className={`tab tab-center ${active ? 'active' : ''}`} onClick={() => go(t.id)} aria-label={t.label}>
              <motion.span className="tab-heart" whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                <motion.span className="tab-heart-ico" animate={active ? { scale: [1, 1.18, 1, 1.12, 1] } : { scale: 1 }}
                  transition={active ? { duration: 1.3, repeat: Infinity, repeatDelay: 1.2 } : {}}>
                  <Icon name="heart" size={26} stroke={2.2} fill={active ? 'currentColor' : 'none'} />
                </motion.span>
              </motion.span>
              <span className="tab-label">{t.label}</span>
            </button>
          )
          return (
            <button key={t.id} className={`tab ${active ? 'active' : ''}`} onClick={() => go(t.id)} aria-label={t.label}>
              {active && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 520, damping: 24, mass: 0.8 }} />}
              <motion.span className="tab-ico" animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                <Icon name={t.icon} size={22} />
              </motion.span>
              <span className="tab-label">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
