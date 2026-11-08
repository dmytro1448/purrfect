// Чорний котик з рожевим бантиком. Стани: idle | happy | sad | sleep | purr | eat | play
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useId, useState } from 'react'
import { reducedMotion } from '../lib/telegram.js'

const loop = (duration, extra = {}) => (reducedMotion ? { duration: 0 } : { duration, repeat: Infinity, ease: 'easeInOut', ...extra })

export default function Cat({ state = 'idle', size = 200, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const g = (n) => `${n}-${uid}`
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (reducedMotion) return
    let t
    const tick = () => {
      t = setTimeout(() => {
        setBlink(true)
        setTimeout(() => setBlink(false), 140)
        tick()
      }, 2200 + Math.random() * 3200)
    }
    tick()
    return () => clearTimeout(t)
  }, [])

  const sleeping = state === 'sleep'
  const happy = state === 'happy' || state === 'purr' || state === 'eat'
  const sad = state === 'sad'
  const eyesClosed = sleeping || happy

  const whole = {
    happy: { y: [0, -12, 0, -6, 0], transition: { duration: 0.9 } },
    eat: { y: [0, -6, 0], transition: loop(0.5) },
    purr: { x: [0, 0.9, -0.9, 0.6, 0], transition: { duration: 0.18, repeat: reducedMotion ? 0 : 8 } },
    play: { rotate: [0, -4, 4, 0], y: [0, -8, 0], transition: loop(0.7) },
    idle: { x: 0, y: 0, rotate: 0 },
    sad: { y: 4, x: 0, rotate: 0 },
    sleep: { y: 6, x: 0, rotate: 0 },
  }[state]

  return (
    <motion.svg viewBox="0 0 220 220" width={size} height={size} className={`cat ${className}`} role="img" aria-label="Котик">
      <defs>
        <radialGradient id={g('head')} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#36303d" />
          <stop offset="0.55" stopColor="#1a171e" />
          <stop offset="1" stopColor="#0e0c11" />
        </radialGradient>
        <radialGradient id={g('body')} cx="0.4" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#2e2934" />
          <stop offset="0.6" stopColor="#17141b" />
          <stop offset="1" stopColor="#0d0b10" />
        </radialGradient>
        <radialGradient id={g('eye')} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#FFF1A8" />
          <stop offset="0.6" stopColor="#FFD86B" />
          <stop offset="1" stopColor="#F2A93B" />
        </radialGradient>
        <linearGradient id={g('pink')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF8AC4" />
          <stop offset="0.6" stopColor="#FF4FA3" />
          <stop offset="1" stopColor="#D6246E" />
        </linearGradient>
        <radialGradient id={g('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FF4FA3" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FF4FA3" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="110" cy="200" rx="90" ry="16" fill={`url(#${g('glow')})`} />
      <ellipse cx="110" cy="202" rx="56" ry="7" fill="#000" opacity="0.5" />

      <motion.g animate={whole} style={{ originX: 0.5, originY: 1 }}>
        {/* хвіст */}
        <motion.path
          d="M148 186 C 188 190, 198 152, 184 128 C 176 114, 184 98, 198 103"
          fill="none" stroke="#141118" strokeWidth="15" strokeLinecap="round"
          style={{ originX: 0, originY: 0.95 }}
          animate={sleeping ? { rotate: 2 } : { rotate: state === 'play' ? [-14, 14, -14] : [-7, 6, -7] }}
          transition={sleeping ? { duration: 1 } : loop(state === 'play' ? 0.6 : 3.2)}
        />
        {/* тіло */}
        <motion.g animate={{ scaleY: [1, 1.018, 1] }} transition={loop(sleeping ? 4.5 : 3.4)} style={{ originX: 0.5, originY: 1 }}>
          <path d="M64 198 C 54 160, 66 122, 110 116 C 154 122, 166 160, 156 198 Z" fill={`url(#${g('body')})`} stroke="#FF8AC4" strokeOpacity=".16" strokeWidth="1.5" />
          <ellipse cx="110" cy="160" rx="20" ry="26" fill="#fff" opacity="0.035" />
          <ellipse cx="91" cy="197" rx="15" ry="8.5" fill="#1d1922" />
          <ellipse cx="129" cy="197" rx="15" ry="8.5" fill="#1d1922" />
          <path d="M86 198v-4M92 199v-5M124 198v-4M130 199v-5" stroke="#000" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
        </motion.g>

        {/* голова */}
        <motion.g
          style={{ originX: 0.5, originY: 0.9 }}
          animate={sad ? { rotate: 5, y: 4 } : sleeping ? { rotate: -6, y: 8 } : { rotate: [0, -2.5, 0, 2.5, 0], y: 0 }}
          transition={sad || sleeping ? { type: 'spring', stiffness: 80, damping: 14 } : loop(9)}
        >
          {/* вуха */}
          <motion.g style={{ originX: 1, originY: 1 }} animate={{ rotate: sad ? -14 : sleeping ? -6 : 0 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
            <path d="M60 82 Q55 42 64 26 Q69 20 76 25 Q93 40 100 60 Z" fill="#17141b" stroke="#2a2330" strokeWidth="3" strokeLinejoin="round" />
            <path d="M67 68 Q65 47 70 36 Q84 46 90 60 Z" fill={`url(#${g('pink')})`} opacity="0.85" />
          </motion.g>
          <motion.g style={{ originX: 0, originY: 1 }} animate={{ rotate: sad ? 14 : sleeping ? 6 : 0 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
            <path d="M160 82 Q165 42 156 26 Q151 20 144 25 Q127 40 120 60 Z" fill="#17141b" stroke="#2a2330" strokeWidth="3" strokeLinejoin="round" />
            <path d="M153 68 Q155 47 150 36 Q136 46 130 60 Z" fill={`url(#${g('pink')})`} opacity="0.85" />
          </motion.g>

          <ellipse cx="110" cy="94" rx="56" ry="47" fill={`url(#${g('head')})`} stroke="#FF8AC4" strokeOpacity=".22" strokeWidth="1.5" />
          <ellipse cx="92" cy="66" rx="20" ry="9" fill="#fff" opacity="0.05" transform="rotate(-18 92 66)" />

          {/* очі */}
          {eyesClosed ? (
            sleeping ? (
              <g stroke="#cfc4d6" strokeOpacity=".7" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M78 96 Q88 103 98 96" /><path d="M122 96 Q132 103 142 96" />
              </g>
            ) : (
              <g stroke="#FFD86B" strokeWidth="4.5" strokeLinecap="round" fill="none">
                <path d="M78 98 Q88 85 98 98" /><path d="M122 98 Q132 85 142 98" />
              </g>
            )
          ) : (
            <motion.g animate={{ scaleY: blink ? 0.08 : 1 }} transition={{ duration: 0.07 }} style={{ originX: 0.5, originY: 0.5 }}>
              {[88, 132].map((cx) => (
                <g key={cx}>
                  <ellipse cx={cx} cy="95" rx="12" ry="14" fill={`url(#${g('eye')})`} />
                  <ellipse cx={cx} cy={sad ? 99 : 95} rx={sad ? 6.5 : 5} ry={sad ? 9 : 11} fill="#0b0a0d" />
                  <circle cx={cx - 4} cy={sad ? 93 : 89} r="3.4" fill="#fff" />
                  <circle cx={cx + 3.5} cy={sad ? 102 : 100} r="1.6" fill="#fff" opacity=".85" />
                </g>
              ))}
              {sad && (
                <g fill="#1c1820">
                  <path d="M74 78 L102 78 L102 87 L74 93 Z" />
                  <path d="M146 78 L118 78 L118 87 L146 93 Z" />
                </g>
              )}
            </motion.g>
          )}
          {sad && <motion.path d="M78 112 q-3 6 0 9 q3 -3 0 -9z" fill="#8fd0ff" opacity=".8" initial={{ y: -4, opacity: 0 }} animate={{ y: [0, 10], opacity: [0.9, 0] }} transition={loop(2.2, { ease: 'easeIn' })} />}

          {/* рум'янець */}
          <ellipse cx="74" cy="112" rx="10" ry="5.5" fill="#FF4FA3" opacity={happy ? 0.55 : 0.3} />
          <ellipse cx="146" cy="112" rx="10" ry="5.5" fill="#FF4FA3" opacity={happy ? 0.55 : 0.3} />

          {/* ніс і рот */}
          <path d="M104.5 108 Q110 103.5 115.5 108 Q110 114.5 104.5 108Z" fill="#FF8AC4" />
          {state === 'eat' ? (
            <motion.ellipse cx="110" cy="120" rx="5" fill="#2a0f1d" stroke="#FF8AC4" strokeWidth="1.5" animate={{ ry: [1.5, 4.5, 1.5] }} transition={loop(0.5)} />
          ) : sad ? (
            <path d="M101 123 Q110 116 119 123" stroke="#e6dbe9" strokeOpacity=".55" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M110 112 Q105 120 98 116 M110 112 Q115 120 122 116" stroke="#e6dbe9" strokeOpacity=".55" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          )}

          {/* вуса */}
          <g stroke="#fff" strokeOpacity=".28" strokeWidth="1.4" strokeLinecap="round">
            <path d="M66 106 L36 100" /><path d="M66 113 L35 115" /><path d="M68 119 L40 128" />
            <path d="M154 106 L184 100" /><path d="M154 113 L185 115" /><path d="M152 119 L180 128" />
          </g>

          {/* бантик */}
          <g transform="translate(161 70) rotate(24) scale(0.82)"><motion.g animate={state === 'happy' || state === 'play' ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
            <path d="M0 0 C -7 -15, -26 -17, -24 -2 C -22 11, -7 9, 0 0Z" fill={`url(#${g('pink')})`} />
            <path d="M0 0 C 7 -15, 26 -17, 24 -2 C 22 11, 7 9, 0 0Z" fill={`url(#${g('pink')})`} />
            <path d="M-3 3 L -10 18 L -3 14.5 Z M3 3 L 10 18 L 3 14.5 Z" fill="#D6246E" />
            <path d="M-6 -2 C -11 -8, -17 -8, -18 -3" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle r="5.5" fill="#FF4FA3" stroke="#D6246E" strokeWidth="1.2" />
            <circle cx="-1.5" cy="-1.8" r="1.6" fill="#fff" opacity=".6" />
          </motion.g></g>
        </motion.g>

        {state === 'eat' && (
          <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <path d="M80 196 h60 q-4 16 -30 16 q-26 0 -30 -16z" fill={`url(#${g('pink')})`} />
            <ellipse cx="110" cy="196" rx="30" ry="4" fill="#5a1a3a" />
          </motion.g>
        )}
        {state === 'play' && (
          <motion.g animate={{ x: [0, 10, 0], y: [0, -14, 0], rotate: [0, 180, 360] }} transition={loop(0.7)} style={{ originX: 0.5, originY: 0.5 }}>
            <circle cx="42" cy="186" r="13" fill={`url(#${g('pink')})`} />
            <path d="M32 180 q10 4 20 14 M30 190 q12 -2 22 -8 M38 174 q6 10 4 24" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" fill="none" />
          </motion.g>
        )}
      </motion.g>

      <AnimatePresence>
        {sleeping && !reducedMotion && [0, 1, 2].map((i) => (
          <motion.text key={'z' + i} x={160 + i * 8} y={60} fill="#FF8AC4" fontFamily="Unbounded, sans-serif" fontWeight="600" fontSize={12 + i * 4}
            initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -30 }} exit={{ opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}>z</motion.text>
        ))}
        {state === 'purr' && [0, 1, 2, 3].map((i) => (
          <motion.path key={'h' + i} d="M0 3 C -8 -3 -4 -10 0 -5 C 4 -10 8 -3 0 3Z" fill="#FF4FA3"
            initial={{ opacity: 0, x: 80 + i * 20, y: 70, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: 10, scale: 1.4 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.4, delay: i * 0.2, repeat: 1 }} />
        ))}
      </AnimatePresence>
    </motion.svg>
  )
}
