// Колесо фортуни: рожево-чорні сектори, фото/емодзі, правдоподібне гальмування, хаптик-тріск
import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react'
import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { haptic, reducedMotion } from '../lib/telegram.js'
import { burstFrom } from './Confetti.jsx'

const S = 320, C = S / 2, R = 150

const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)]
}
function sector(a0, a1) {
  const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1)
  return `M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`
}

export default function Wheel({ items, onResult, ref, onSpinStart }) {
  const uid = useId().replace(/:/g, '')
  const rot = useMotionValue(0)
  const pointer = useMotionValue(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [okImg, setOkImg] = useState({})
  const lastTick = useRef({ idx: 0, t: 0 })
  const wrap = useRef()
  const n = Math.max(items.length, 1)
  const seg = 360 / n

  // перевіряємо, які фото справді завантажуються
  useEffect(() => {
    items.forEach((it) => {
      if (!it.photo || okImg[it.photo] !== undefined) return
      const im = new Image()
      im.onload = () => setOkImg((o) => ({ ...o, [it.photo]: true }))
      im.onerror = () => setOkImg((o) => ({ ...o, [it.photo]: false }))
      im.src = it.photo
    })
  }, [items]) // eslint-disable-line

  useMotionValueEvent(rot, 'change', (v) => {
    const idx = Math.floor((v + seg / 2) / seg)
    if (idx !== lastTick.current.idx) {
      lastTick.current.idx = idx
      const now = performance.now()
      if (now - lastTick.current.t > 45) {
        lastTick.current.t = now
        haptic.select()
        animate(pointer, [0, -18, 0], { duration: 0.16, ease: 'easeOut' })
      }
    }
  })

  const spin = async () => {
    if (spinning || !items.length) return
    setWinner(null)
    setSpinning(true)
    onSpinStart?.()
    haptic.medium()
    const w = Math.floor(Math.random() * items.length)
    const center = w * seg + seg / 2
    const cur = rot.get()
    const jitter = (Math.random() - 0.5) * seg * 0.6
    const delta = (((-center + jitter - cur) % 360) + 360) % 360
    const turns = reducedMotion ? 1 : 5 + Math.floor(Math.random() * 3)
    if (!reducedMotion) await animate(rot, cur - 14, { duration: 0.28, ease: [0.4, 0, 0.6, 1] })
    await animate(rot, cur + turns * 360 + delta, { duration: reducedMotion ? 0.8 : 5.4, ease: [0.11, 0.72, 0.06, 1] })
    setWinner(w)
    setSpinning(false)
    haptic.success()
    burstFrom(wrap.current)
    onResult?.(items[w])
  }

  useImperativeHandle(ref, () => ({ spin }))

  return (
    <div className="wheel" ref={wrap}>
      <motion.div className="wheel-pointer" style={{ rotate: pointer }}>
        <svg width="34" height="38" viewBox="0 0 34 38"><path d="M17 36 L3 8 Q1 2 8 2 H26 Q33 2 31 8 Z" fill="url(#ptr)" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" /><defs><linearGradient id="ptr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF8AC4" /><stop offset="1" stopColor="#E0307D" /></linearGradient></defs></svg>
      </motion.div>
      <div className="wheel-glow" />
      <motion.svg viewBox={`0 0 ${S} ${S}`} className="wheel-svg" style={{ rotate: rot }}>
        <defs>
          <linearGradient id={`p-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF6FB5" /><stop offset="1" stopColor="#C8246F" /></linearGradient>
          <linearGradient id={`b-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2a2230" /><stop offset="1" stopColor="#141016" /></linearGradient>
          {items.map((it, i) => {
            const [x, y] = pt(R * 0.66, i * seg + seg / 2)
            const d = Math.min(R * 0.5, 2 * R * 0.66 * Math.sin(Math.PI / n) * 0.82)
            return <clipPath key={i} id={`c-${uid}-${i}`}><circle cx={x} cy={y} r={d / 2} /></clipPath>
          })}
        </defs>
        <circle cx={C} cy={C} r={R + 8} fill="#120e14" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
        {items.map((it, i) => {
          const a0 = i * seg, a1 = a0 + seg
          const [x, y] = pt(R * 0.66, a0 + seg / 2)
          const d = Math.min(R * 0.5, 2 * R * 0.66 * Math.sin(Math.PI / n) * 0.82)
          const pink = n % 2 && i === n - 1 ? 'mid' : i % 2 === 0
          const fill = pink === 'mid' ? '#5b2346' : pink ? `url(#p-${uid})` : `url(#b-${uid})`
          const photo = it.photo && okImg[it.photo]
          return (
            <g key={it.id || i} className={winner === i ? 'wheel-win' : winner !== null ? 'wheel-dim' : ''}>
              <path d={n === 1 ? `M${C} ${C - R} A${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z` : sector(a0, a1)} fill={fill} stroke="rgba(0,0,0,.35)" strokeWidth="1" />
              <circle cx={x} cy={y} r={d / 2 + 2.5} fill={i % 2 === 0 ? '#fff' : '#FF4FA3'} opacity={i % 2 === 0 ? 0.9 : 0.75} />
              {photo ? (
                <image href={it.photo} x={x - d / 2} y={y - d / 2} width={d} height={d} preserveAspectRatio="xMidYMid slice" clipPath={`url(#c-${uid}-${i})`} />
              ) : (
                <>
                  <circle cx={x} cy={y} r={d / 2} fill={i % 2 === 0 ? '#2a1a26' : '#1a1218'} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={d * 0.48} transform={`rotate(${a0 + seg / 2} ${x} ${y})`}>{it.emoji || '🍽️'}</text>
                </>
              )}
            </g>
          )
        })}
        {Array.from({ length: n }).map((_, i) => {
          const [x, y] = pt(R + 3.5, i * seg)
          return <circle key={'d' + i} cx={x} cy={y} r="2.6" fill="#FFD1E6" opacity=".9" />
        })}
      </motion.svg>
      <motion.button className="wheel-hub" onClick={spin} whileTap={{ scale: 0.9 }} disabled={spinning} aria-label="Крутити">
        <Icon name="dice" size={26} />
      </motion.button>
    </div>
  )
}
