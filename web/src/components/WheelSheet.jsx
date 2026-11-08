import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import Wheel from './Wheel.jsx'
import { Button, Img } from './ui.jsx'

// Шит з колесом. items: [{id, title, photo?, emoji?, sub?}]
export default function WheelSheet({ open, onClose, items, title = 'Крутимо колесо', resultLabel = 'Сьогодні у нас', onPick, pickLabel }) {
  const [res, setRes] = useState(null)
  const [phase, setPhase] = useState('idle')
  const wheel = useRef()
  useEffect(() => { if (open) { setRes(null); setPhase('idle') } }, [open])
  const list = items.slice(0, 12)

  return (
    <Sheet open={open} onClose={onClose} bare className="wheel-sheet">
      <div className="wheel-sheet-in">
        <motion.p className="eyebrow center" key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {phase === 'spin' ? 'Крутимо колесо…' : phase === 'done' ? resultLabel : title}
        </motion.p>
        <Wheel ref={wheel} items={list} onSpinStart={() => { setRes(null); setPhase('spin') }} onResult={(r) => { setRes(r); setPhase('done') }} />
        <div className="wheel-result-slot">
          <AnimatePresence mode="wait">
            {res ? (
              <motion.div key={res.id} className="wheel-result" initial={{ opacity: 0, y: 20, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
                {res.photo ? <Img src={res.photo} emoji={res.emoji} className="wheel-result-img" alt={res.title} /> : <div className="wheel-result-emoji">{res.emoji || '✨'}</div>}
                <div className="wheel-result-txt">
                  <b>{res.title}</b>
                  {res.sub && <span>{res.sub}</span>}
                </div>
              </motion.div>
            ) : (
              <motion.p key="hint" className="muted center small" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {phase === 'spin' ? 'Ще мить…' : list.length < 2 ? 'Додайте хоча б два варіанти' : 'Натисни на центр або кнопку нижче'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="row gap">
          <Button variant="ghost" onClick={() => wheel.current?.spin()} disabled={phase === 'spin' || list.length < 2} icon="refresh" block>
            {phase === 'done' ? 'Ще раз' : 'Крутити'}
          </Button>
          {res && onPick && <Button onClick={() => { onPick(res); }} block>{pickLabel || 'Обрати'}</Button>}
        </div>
      </div>
    </Sheet>
  )
}
