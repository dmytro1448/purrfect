// Глобальний canvas-оверлей: конфеті та серця. burst({x,y,kind})
import { useEffect, useRef } from 'react'
import { reducedMotion } from '../lib/telegram.js'

const COLORS = ['#FF4FA3', '#FF8AC4', '#FFD1E6', '#C23B8A', '#9B4DFF', '#FFFFFF', '#FFC56B']
let fire = null

export function burst(opts = {}) {
  if (reducedMotion) return
  fire?.(opts)
}
export function burstFrom(el, opts = {}) {
  const r = el?.getBoundingClientRect?.()
  if (!r) return burst(opts)
  burst({ x: r.left + r.width / 2, y: r.top + r.height / 2, ...opts })
}

function heartPath(ctx, s) {
  ctx.beginPath()
  ctx.moveTo(0, s * 0.35)
  ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.45, -s * 1.05, 0, -s * 0.45)
  ctx.bezierCurveTo(s * 0.45, -s * 1.05, s, -s * 0.3, 0, s * 0.35)
  ctx.fill()
}

export default function Confetti() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c.getContext('2d')
    let parts = [], raf = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      c.width = innerWidth * dpr; c.height = innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    let last = 0
    const tick = (now) => {
      const k = last ? Math.min(4, (now - last) / 16.67) : 1
      last = now
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      parts = parts.filter((p) => p.life > 0)
      const drag = Math.pow(0.985, k)
      for (const p of parts) {
        p.vy += p.g * k; p.vx *= drag; p.vy *= drag
        p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k; p.life -= k
        ctx.save()
        ctx.globalAlpha = Math.min(1, p.life / 30)
        ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.heart) heartPath(ctx, p.size)
        else { ctx.scale(1, Math.cos(p.rot * 3)); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2) }
        ctx.restore()
      }
      if (!parts.length) ctx.clearRect(0, 0, innerWidth, innerHeight)
      raf = parts.length ? requestAnimationFrame(tick) : 0
      if (!raf) last = 0
    }
    fire = ({ x = innerWidth / 2, y = innerHeight / 2.5, kind = 'confetti', count } = {}) => {
      const hearts = kind === 'hearts'
      const n = count || (hearts ? 22 : 70)
      for (let i = 0; i < n; i++) {
        const a = hearts ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2
        const sp = hearts ? 3 + Math.random() * 5 : 4 + Math.random() * 8
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (hearts ? 1 : 3), g: hearts ? 0.06 : 0.22,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * (hearts ? 0.05 : 0.3), size: hearts ? 7 + Math.random() * 8 : 6 + Math.random() * 6,
          color: hearts ? COLORS[Math.floor(Math.random() * 3)] : COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 80 + Math.random() * 50, heart: hearts || Math.random() < 0.18,
        })
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); fire = null }
  }, [])
  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}
