import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { useSignal } from '../../lib/hooks.js'
import { haptic } from '../../lib/telegram.js'
import Icon from '../../components/Icon.jsx'
import Cat from '../../components/Cat.jsx'
import { Empty, spring } from '../../components/ui.jsx'

export default function Shop({ addSignal }) {
  const { byKind, create, update, remove } = useStore()
  const [text, setText] = useState('')
  const [showDone, setShowDone] = useState(true)
  const input = useRef()
  useSignal(addSignal, () => input.current?.focus())

  const list = byKind.shop || []
  const active = list.filter((i) => !i.done).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const done = list.filter((i) => i.done)

  const add = (e) => {
    e?.preventDefault()
    const t = text.trim()
    if (!t) return
    const m = t.match(/^(.*?)[\s]*[x×х*]\s*(\d+)$/i)
    haptic.tap()
    create('shop', m ? { title: m[1].trim(), qty: m[2] } : { title: t })
    setText('')
  }
  const clearDone = () => { haptic.medium(); done.forEach((i) => remove(i.id)) }

  return (
    <div className="stack-s">
      <form className="quick-add" onSubmit={add}>
        <Icon name="plus" size={18} className="muted" />
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Що купити? Напр. «Молоко x2»" enterKeyHint="done" />
        <AnimatePresence>
          {text.trim() && (
            <motion.button type="submit" className="quick-add-btn" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={spring}>
              <Icon name="check" size={18} stroke={2.6} />
            </motion.button>
          )}
        </AnimatePresence>
      </form>

      {!list.length && (
        <Empty title="Список порожній" text="Додайте першу покупку — і котик почне чекати смаколиків">
          <Cat state="idle" size={120} />
        </Empty>
      )}

      <motion.ul className="list" layout>
        <AnimatePresence initial={false} mode="popLayout">
          {active.map((it) => <ShopRow key={it.id} it={it} onToggle={() => update(it.id, { done: true })} onRemove={() => remove(it.id)} />)}
        </AnimatePresence>
      </motion.ul>

      {done.length > 0 && (
        <motion.div layout className="done-block">
          <div className="done-head">
            <button className="done-toggle" onClick={() => { haptic.select(); setShowDone((v) => !v) }}>
              <motion.span animate={{ rotate: showDone ? 0 : -90 }}><Icon name="chevronDown" size={16} /></motion.span>
              Куплено · {done.length}
            </button>
            <button className="link-btn small" onClick={clearDone}>Очистити</button>
          </div>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.ul className="list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <AnimatePresence initial={false} mode="popLayout">
                  {done.map((it) => <ShopRow key={it.id} it={it} onToggle={() => update(it.id, { done: false })} onRemove={() => remove(it.id)} />)}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

function ShopRow({ it, onToggle, onRemove }) {
  const [checking, setChecking] = useState(false)
  const on = it.done || checking
  const toggle = () => {
    if (it.done) { haptic.tap(); onToggle(); return }
    haptic.success()
    setChecking(true)
    setTimeout(onToggle, 420)
  }
  return (
    <motion.li layout className={`row-item ${it.done ? 'is-done' : ''}`}
      initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={spring}>
      <Check on={on} onClick={toggle} />
      <span className="row-title" onClick={toggle}>
        <span className="strike-wrap">
          <span className={on ? 'dim' : ''}>{it.data.title}</span>
          <motion.span className="strike" initial={false} animate={{ scaleX: on ? 1 : 0 }} transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1] }} />
        </span>
      </span>
      {it.data.qty && <span className="qty">×{it.data.qty}</span>}
      <button className="row-x" onClick={() => { haptic.tap(); onRemove() }} aria-label="Видалити"><Icon name="x" size={16} /></button>
    </motion.li>
  )
}

export function Check({ on, onClick, size = 26 }) {
  return (
    <motion.button type="button" className={`check ${on ? 'on' : ''}`} style={{ width: size, height: size }} onClick={(e) => { e.stopPropagation(); onClick(e) }}
      whileTap={{ scale: 0.82 }} animate={on ? { scale: [1, 1.18, 1] } : { scale: 1 }} transition={{ duration: 0.3 }} aria-label="Позначити">
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}>
        <motion.path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} />
      </svg>
    </motion.button>
  )
}
