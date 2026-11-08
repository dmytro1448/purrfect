// Bottom sheet: spring-поява, drag-to-dismiss за ручку/заголовок, Telegram BackButton
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect } from 'react'
import { useBackButton, haptic } from '../lib/telegram.js'
import Icon from './Icon.jsx'

let openCount = 0

export default function Sheet({ open, onClose, title, subtitle, children, footer, className = '', bare = false }) {
  return createPortal(
    <AnimatePresence>
      {open && <SheetInner key="s" {...{ onClose, title, subtitle, footer, className, bare }}>{children}</SheetInner>}
    </AnimatePresence>,
    document.body,
  )
}

function SheetInner({ onClose, title, subtitle, children, footer, className, bare }) {
  const controls = useDragControls()
  useBackButton(true, onClose)
  useEffect(() => {
    openCount++
    document.body.classList.add('sheet-open')
    return () => { if (--openCount <= 0) { openCount = 0; document.body.classList.remove('sheet-open') } }
  }, [])
  return (
    <div className="sheet-root">
      <motion.div className="sheet-backdrop" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
      <motion.div
        className={`sheet ${className}`}
        role="dialog" aria-modal="true"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }}
        drag="y" dragControls={controls} dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 0.9 }}
        onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) { haptic.soft(); onClose() } }}
      >
        <div className="sheet-grab" onPointerDown={(e) => controls.start(e)} style={{ touchAction: 'none' }}>
          <div className="sheet-handle" />
          {!bare && title && (
            <div className="sheet-head">
              <div>
                <h3 className="sheet-title">{title}</h3>
                {subtitle && <p className="sheet-sub">{subtitle}</p>}
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Закрити"><Icon name="x" size={18} /></button>
            </div>
          )}
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </motion.div>
    </div>
  )
}
