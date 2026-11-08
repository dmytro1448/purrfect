// Базові UI-примітиви
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { haptic, useBackButton, reducedMotion } from '../lib/telegram.js'

export const spring = { type: 'spring', stiffness: 520, damping: 36 }
export const softSpring = { type: 'spring', stiffness: 300, damping: 30 }

export function Button({ children, variant = 'primary', size, icon, className = '', loading, onClick, block, ...p }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} transition={spring}
      className={`btn btn-${variant} ${size ? 'btn-' + size : ''} ${block ? 'btn-block' : ''} ${className}`}
      onClick={(e) => { if (loading) return; haptic.tap(); onClick?.(e) }} {...p}>
      {loading ? <span className="spinner" /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children && <span>{children}</span>}
    </motion.button>
  )
}

export function IconButton({ icon, onClick, label, className = '', size = 18, ...p }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} transition={spring} className={`icon-btn ${className}`} aria-label={label}
      onClick={(e) => { haptic.tap(); onClick?.(e) }} {...p}>
      <Icon name={icon} size={size} />
    </motion.button>
  )
}

export function Fab({ onClick, icon = 'plus', label = 'Додати' }) {
  return (
    <motion.button className="fab" whileTap={{ scale: 0.9 }} transition={spring} aria-label={label}
      onClick={() => { haptic.medium(); onClick() }}>
      <Icon name={icon} size={24} stroke={2.4} />
    </motion.button>
  )
}

// Сегментований контрол з «перетікаючою» пігулкою
export function Segmented({ value, onChange, options, small, className = '' }) {
  const id = useId()
  return (
    <div className={`seg ${small ? 'seg-sm' : ''} ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} role="tab" aria-selected={active} disabled={o.disabled}
            className={`seg-item ${active ? 'active' : ''}`}
            onClick={() => { if (!active) { haptic.select(); onChange(o.value) } }}>
            {active && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />}
            <span className="seg-label">{o.icon && <Icon name={o.icon} size={16} />}{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Chips({ value, onChange, options, multi, className = '', wrap = true }) {
  const isOn = (v) => (multi ? (value || []).includes(v) : value === v)
  return (
    <div className={`chips ${wrap ? 'wrap' : 'scroll'} ${className}`}>
      {options.map((o) => (
        <motion.button key={String(o.value)} type="button" whileTap={{ scale: 0.95 }} transition={spring}
          className={`chip ${isOn(o.value) ? 'on' : ''}`} disabled={o.disabled}
          onClick={() => {
            haptic.select()
            if (multi) onChange(isOn(o.value) ? value.filter((x) => x !== o.value) : [...(value || []), o.value])
            else onChange(isOn(o.value) && o.toggle ? null : o.value)
          }}>
          {o.icon && <Icon name={o.icon} size={14} />}{o.emoji && <span className="chip-emoji">{o.emoji}</span>}{o.label}
        </motion.button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children, required }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}{required && <i>*</i>}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); haptic.select(); onChange(!on) }}>
      <motion.span className="toggle-knob" layout transition={{ type: 'spring', stiffness: 700, damping: 32 }} />
    </button>
  )
}

export function Stepper({ value, onChange, min = 0, max = 99, suffix }) {
  return (
    <div className="stepper">
      <IconButton icon="minus" size={16} onClick={() => onChange(Math.max(min, value - 1))} label="Менше" />
      <span className="stepper-val">{value}{suffix && <small> {suffix}</small>}</span>
      <IconButton icon="plus" size={16} onClick={() => onChange(Math.min(max, value + 1))} label="Більше" />
    </div>
  )
}

export function Stars({ value = 0, onChange, size = 18 }) {
  return (
    <div className={`stars ${onChange ? 'editable' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button type="button" key={n} disabled={!onChange} whileTap={{ scale: 0.8 }}
          className={n <= value ? 'on' : ''} onClick={() => { haptic.select(); onChange?.(n === value ? 0 : n) }}>
          <Icon name="star" size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </motion.button>
      ))}
    </div>
  )
}

// Картинка з фолбеком на градієнт + емодзі
export function Img({ src, alt = '', emoji = '💗', className = '', style, seed = '' }) {
  const [failed, setFailed] = useState(!src)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setFailed(!src); setLoaded(false) }, [src])
  const hue = [...(seed || alt)].reduce((a, c) => a + c.charCodeAt(0), 0) % 4
  if (failed) return <div className={`img-fallback fb-${hue} ${className}`} style={style}><span>{emoji}</span></div>
  return (
    <div className={`img-wrap ${loaded ? 'loaded' : ''} ${className}`} style={style}>
      <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </div>
  )
}

export function Avatar({ member, size = 40, ring }) {
  const name = member?.name || '?'
  const [bad, setBad] = useState(false)
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`avatar av-${member?.color || 'pink'} ${ring ? 'ring' : ''} ${member?.pending ? 'pending' : ''}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {member?.avatar_url && !bad ? <img src={member.avatar_url} alt={name} onError={() => setBad(true)} /> : <span>{initials}</span>}
    </div>
  )
}

export function CountUp({ value = 0, duration = 1.4, className }) {
  const mv = useMotionValue(reducedMotion ? value : 0)
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString('uk-UA'))
  const first = useRef(true)
  useEffect(() => {
    const c = animate(mv, value, { duration: first.current ? duration : 0.6, ease: [0.16, 1, 0.3, 1] })
    first.current = false
    return () => c.stop()
  }, [value]) // eslint-disable-line
  return <motion.span className={className}>{rounded}</motion.span>
}

export function Bar({ value, max = 100, tone = 'pink', label }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  return (
    <div className={`bar bar-${tone}`} aria-label={label} role="progressbar" aria-valuenow={Math.round(pct)}>
      <motion.div className="bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
    </div>
  )
}

export function Skeleton({ h = 72, r = 20, style }) {
  return <div className="skeleton" style={{ height: h, borderRadius: r, ...style }} />
}

export function Empty({ title, text, action, onAction, icon, cat = true, children }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
      {cat ? <div className="empty-art">{children}</div> : icon && <div className="empty-ico"><Icon name={icon} size={28} /></div>}
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action && <Button onClick={onAction} icon="plus" size="sm">{action}</Button>}
    </motion.div>
  )
}

export function SectionTitle({ children, action, onAction }) {
  return (
    <div className="section-title">
      <h3>{children}</h3>
      {action && <button className="link-btn" onClick={() => { haptic.tap(); onAction() }}>{action}</button>}
    </div>
  )
}

// Вкладений повноекранний екран (слайд справа)
export function Page({ open, onClose, title, children, right, className = '' }) {
  return createPortal(
    <AnimatePresence>
      {open && <PageInner key="p" {...{ onClose, title, right, className }}>{children}</PageInner>}
    </AnimatePresence>,
    document.body,
  )
}
function PageInner({ onClose, title, children, right, className }) {
  useBackButton(true, onClose)
  return (
    <motion.div className={`page ${className}`} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 40 }}>
      <div className="page-head">
        <IconButton icon="chevronLeft" onClick={onClose} label="Назад" />
        <h2>{title}</h2>
        <div className="page-right">{right}</div>
      </div>
      <div className="page-body">{children}</div>
    </motion.div>
  )
}

// stagger-обгортка для списків карток
export const listV = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } }
export const itemV = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
}

export function Shimmer({ lines = 3 }) {
  return (
    <div className="ai-shimmer">
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="shimmer-line" style={{ width: `${90 - i * 14}%` }} />)}
    </div>
  )
}

export function PhotoPicker({ value, onChange, uploading, label = 'Додати фото', multiple }) {
  const ref = useRef()
  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden multiple={multiple} onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) onChange(multiple ? f : f[0]) }} />
      <motion.button type="button" whileTap={{ scale: 0.97 }} className={`photo-pick ${value ? 'has' : ''}`} onClick={() => ref.current.click()}>
        {value ? <img src={value} alt="" /> : <><Icon name="camera" size={22} /><span>{label}</span></>}
        {uploading && <span className="photo-pick-load"><span className="spinner" /></span>}
      </motion.button>
    </>
  )
}
