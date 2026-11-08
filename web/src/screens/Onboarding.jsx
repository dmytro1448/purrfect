import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useStore, errText } from '../lib/store.jsx'
import { api, isMock } from '../api/index.js'
import { haptic, tg, tgUser } from '../lib/telegram.js'
import { todayISO, daysBetween, pl, DAYS } from '../lib/dates.js'
import Cat from '../components/Cat.jsx'
import Logo from '../components/Logo.jsx'
import { Button, Field } from '../components/ui.jsx'
import { toast } from '../components/Toast.jsx'
import { burst } from '../components/Confetti.jsx'

function inviteCode() {
  const q = new URLSearchParams(location.search).get('join')
  if (q) return q
  const sp = tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('tgWebAppStartParam')
  if (sp?.startsWith('join_')) return sp.slice(5)
  return ''
}

export default function Onboarding() {
  const { setMe, refetch, me } = useStore()
  const code0 = inviteCode()
  const [step, setStep] = useState(code0 ? 'join' : 'hello')
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const u = tgUser()
  const [f, setF] = useState({
    my_name: u?.first_name || me?.member?.name || '', partner_name: 'Надійчик', couple_name: '', started_at: '2025-01-24', cat_name: 'Ожинка', code: code0,
  })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const order = ['hello', 'names', 'us', 'cat']
  const go = (s) => {
    const a = order.indexOf(step), b = order.indexOf(s)
    setDir(b >= a ? 1 : -1); haptic.tap(); setStep(s)
  }

  const finish = async () => {
    setBusy(true)
    try {
      const m = await api.call('onboard', {
        my_name: f.my_name.trim(), partner_name: f.partner_name.trim(), couple_name: f.couple_name.trim() || `${f.my_name.trim()} & ${f.partner_name.trim()}`,
        started_at: f.started_at, cat_name: f.cat_name.trim() || 'Котик',
      })
      haptic.success(); burst({}); burst({ kind: 'hearts' })
      setTimeout(() => { setMe(m); refetch() }, 500)
    } catch (e) { toast(errText(e), 'error'); setBusy(false) }
  }
  const join = async () => {
    setBusy(true)
    try {
      const m = await api.call('join', { code: f.code.trim(), my_name: f.my_name.trim() })
      haptic.success(); burst({ kind: 'hearts' })
      setTimeout(() => { setMe(m); refetch() }, 400)
    } catch (e) { toast(errText(e), 'error'); setBusy(false) }
  }
  const demo = async () => {
    setBusy(true)
    try { await api.call('mock.seed'); burst({}); await refetch() } finally { setBusy(false) }
  }

  const idx = order.indexOf(step)
  const days = f.started_at ? Math.max(0, daysBetween(f.started_at, todayISO())) : 0

  return (
    <div className="onb">
      <div className="onb-top">
        <Logo />
        {step !== 'hello' && step !== 'join' && (
          <div className="onb-dots">{order.slice(1).map((s, i) => <motion.span key={s} animate={{ width: i + 1 === idx ? 22 : 7, opacity: i + 1 <= idx ? 1 : 0.35 }} />)}</div>
        )}
      </div>
      <div className="onb-stage">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} className="onb-step" custom={dir}
            variants={{ in: (d) => ({ x: d * 60, opacity: 0 }), c: { x: 0, opacity: 1 }, out: (d) => ({ x: d * -60, opacity: 0 }) }}
            initial="in" animate="c" exit="out" transition={{ type: 'spring', stiffness: 340, damping: 34 }}>

            {step === 'hello' && (
              <div className="onb-hello">
                <motion.div className="onb-cat" initial={{ scale: 0.6, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.1 }}>
                  <Cat state="happy" size={230} />
                </motion.div>
                <motion.h1 className="onb-title" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  Ваш затишний<br /><span className="grad-text">куточок на двох</span>
                </motion.h1>
                <motion.p className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  Справи, покупки, вішліст, місця й записки одне одному — і пухнастий котик, якого ви ростите разом.
                </motion.p>
              </div>
            )}

            {step === 'names' && (
              <div className="stack">
                <div className="onb-head"><span className="onb-emoji">👋</span><h2 className="h1">Знайомимось</h2><p className="muted">Як вас звати?</p></div>
                <Field label="Твоє імʼя"><input className="input input-lg" value={f.my_name} onChange={(e) => set('my_name', e.target.value)} placeholder="Дмитро" autoFocus /></Field>
                <Field label="Імʼя твоєї половинки"><input className="input input-lg" value={f.partner_name} onChange={(e) => set('partner_name', e.target.value)} placeholder="Надійчик" /></Field>
              </div>
            )}

            {step === 'us' && (
              <div className="stack">
                <div className="onb-head"><span className="onb-emoji">💞</span><h2 className="h1">Ваша історія</h2><p className="muted">Коли все почалося?</p></div>
                <Field label="Назва пари" hint="Можна залишити порожнім"><input className="input input-lg" value={f.couple_name} onChange={(e) => set('couple_name', e.target.value)} placeholder={`${f.my_name || 'Я'} & ${f.partner_name || 'ти'}`} /></Field>
                <Field label="Разом з"><input type="date" className="input input-lg" value={f.started_at} max={todayISO()} onChange={(e) => set('started_at', e.target.value)} /></Field>
                {days > 0 && <motion.div className="onb-days" key={days} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>Це вже <b>{pl(days, DAYS)}</b> разом 🥹</motion.div>}
              </div>
            )}

            {step === 'cat' && (
              <div className="stack center">
                <div className="onb-head"><h2 className="h1">Знайомтесь — ваш котик</h2><p className="muted">Він росте, коли ви дбаєте одне про одного</p></div>
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity }}><Cat state="idle" size={190} /></motion.div>
                <Field label="Як назвемо?"><input className="input input-lg center" value={f.cat_name} onChange={(e) => set('cat_name', e.target.value)} placeholder="Ожинка" /></Field>
              </div>
            )}

            {step === 'join' && (
              <div className="stack">
                <div className="onb-head"><span className="onb-emoji">🔑</span><h2 className="h1">Приєднатися до пари</h2><p className="muted">Встав код із запрошення</p></div>
                <Field label="Код запрошення"><input className="input input-lg input-code" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="ABC123" autoCapitalize="characters" /></Field>
                <Field label="Твоє імʼя"><input className="input input-lg" value={f.my_name} onChange={(e) => set('my_name', e.target.value)} placeholder="Імʼя" /></Field>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="onb-foot">
        {step === 'hello' && <>
          <Button block size="lg" onClick={() => go('names')}>Створити пару</Button>
          <Button block variant="ghost" onClick={() => { setDir(1); haptic.tap(); setStep('join') }}>У мене є код запрошення</Button>
          {isMock && <button className="link-btn small" onClick={demo} disabled={busy}>✨ Демо-дані — подивитись усе одразу</button>}
        </>}
        {step === 'names' && <div className="row gap"><Button variant="ghost" icon="chevronLeft" onClick={() => go('hello')} /><Button block size="lg" onClick={() => go('us')} disabled={!f.my_name.trim() || !f.partner_name.trim()}>Далі</Button></div>}
        {step === 'us' && <div className="row gap"><Button variant="ghost" icon="chevronLeft" onClick={() => go('names')} /><Button block size="lg" onClick={() => go('cat')} disabled={!f.started_at}>Далі</Button></div>}
        {step === 'cat' && <div className="row gap"><Button variant="ghost" icon="chevronLeft" onClick={() => go('us')} /><Button block size="lg" icon="heart" onClick={finish} loading={busy}>Створити пару</Button></div>}
        {step === 'join' && <div className="row gap"><Button variant="ghost" icon="chevronLeft" onClick={() => { setDir(-1); setStep('hello') }} /><Button block size="lg" onClick={join} loading={busy} disabled={f.code.trim().length < 4 || !f.my_name.trim()}>Приєднатися</Button></div>}
      </div>
    </div>
  )
}
