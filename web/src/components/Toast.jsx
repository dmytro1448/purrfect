import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Icon from './Icon.jsx'
import { haptic } from '../lib/telegram.js'

const subs = new Set()
export function toast(text, type = 'info') {
  if (type === 'error') haptic.error()
  subs.forEach((f) => f({ id: Math.random(), text, type }))
}

export default function Toaster() {
  const [list, setList] = useState([])
  useEffect(() => {
    const f = (t) => {
      setList((l) => [...l.slice(-1), t])
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 2800)
    }
    subs.add(f)
    return () => subs.delete(f)
  }, [])
  return (
    <div className="toaster">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div key={t.id} className={`toast toast-${t.type}`} layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }} onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}>
            <span className="toast-ico"><Icon name={t.type === 'error' ? 'info' : t.type === 'success' ? 'check' : 'heart'} size={16} /></span>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
