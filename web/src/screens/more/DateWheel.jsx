import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useStore, errText } from '../../lib/store.jsx'
import { haptic } from '../../lib/telegram.js'
import Icon from '../../components/Icon.jsx'
import Sheet from '../../components/Sheet.jsx'
import WheelSheet from '../../components/WheelSheet.jsx'
import { Button, Chips, Field, Shimmer, spring } from '../../components/ui.jsx'
import { Check } from '../house/Shop.jsx'
import { toast } from '../../components/Toast.jsx'
import { burst } from '../../components/Confetti.jsx'

export const VIBES = [{ value: 'home', label: 'Вдома', emoji: '🏠' }, { value: 'out', label: 'Вийти', emoji: '🌆' }, { value: 'active', label: 'Активно', emoji: '⚡' }]
export const COSTS = [{ value: 'free', label: 'Безкоштовно' }, { value: '$', label: '₴' }, { value: '$$', label: '₴₴' }]
const costLbl = (c) => COSTS.find((x) => x.value === c)?.label
const vibeLbl = (v) => VIBES.find((x) => x.value === v)

export default function DateWheel() {
  const { byKind, remove } = useStore()
  const [vibe, setVibe] = useState(null)
  const [cost, setCost] = useState(null)
  const [wheel, setWheel] = useState(false)
  const [add, setAdd] = useState(false)
  const [ai, setAi] = useState(false)
  const all = byKind.idea || []
  const list = all.filter((i) => (!vibe || i.data.vibe === vibe) && (!cost || i.data.cost === cost))

  return (
    <div className="stack">
      <motion.button className="card spin-card" whileTap={{ scale: 0.98 }} onClick={() => { haptic.medium(); if (list.length < 2) { toast('Потрібно хоча б 2 ідеї під ці фільтри'); return } setWheel(true) }}>
        <div className="spin-wheel-mini"><Icon name="wheel" size={34} stroke={1.6} /></div>
        <div className="grow left">
          <b className="h3">Крутнути колесо</b>
          <p className="muted small">{list.length} {list.length === 1 ? 'ідея' : list.length < 5 && list.length ? 'ідеї' : 'ідей'} в барабані</p>
        </div>
        <Icon name="chevronRight" size={18} />
      </motion.button>

      <div className="stack-s">
        <Chips value={vibe} onChange={setVibe} options={VIBES.map((v) => ({ ...v, toggle: true }))} />
        <Chips value={cost} onChange={setCost} options={COSTS.map((v) => ({ ...v, toggle: true }))} />
      </div>

      <div className="row gap">
        <Button variant="ai" icon="sparkles" block onClick={() => setAi(true)}>Підкинути ідей</Button>
        <Button variant="ghost" icon="plus" onClick={() => setAdd(true)}>Своя</Button>
      </div>

      <ul className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((i) => (
            <motion.li layout key={i.id} className="idea" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} transition={spring}>
              <span className="idea-emoji">{i.data.emoji || '💗'}</span>
              <div className="grow min0">
                <b className="ellipsis">{i.data.title}</b>
                <div className="task-meta">
                  {i.data.vibe && <span className="tag">{vibeLbl(i.data.vibe)?.emoji} {vibeLbl(i.data.vibe)?.label}</span>}
                  {i.data.cost && <span className="tag tag-pink">{costLbl(i.data.cost)}</span>}
                </div>
              </div>
              <button className="row-x" onClick={() => { haptic.tap(); remove(i.id) }} aria-label="Видалити"><Icon name="x" size={16} /></button>
            </motion.li>
          ))}
        </AnimatePresence>
        {!list.length && <p className="muted small center pad">Немає ідей під ці фільтри — підкинь нових ✨</p>}
      </ul>

      <WheelSheet open={wheel} onClose={() => setWheel(false)} title="Куди йдемо?" resultLabel="Наше побачення"
        items={list.map((i) => ({ id: i.id, title: i.data.title, emoji: i.data.emoji || '💗', sub: [vibeLbl(i.data.vibe)?.label, costLbl(i.data.cost)].filter(Boolean).join(' · ') }))}
        onPick={() => { setWheel(false); burst({ kind: 'hearts' }); toast('Чудовий план! Гарного побачення 💗', 'success') }} pickLabel="Домовились!" />
      <IdeaAdd open={add} onClose={() => setAdd(false)} />
      <AiIdeas open={ai} onClose={() => setAi(false)} vibe={vibe} cost={cost} />
    </div>
  )
}

function IdeaAdd({ open, onClose }) {
  const { create } = useStore()
  const [f, setF] = useState({ title: '', emoji: '', vibe: null, cost: null })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const save = () => {
    if (!f.title.trim()) return
    const d = { title: f.title.trim() }
    if (f.emoji) d.emoji = f.emoji
    if (f.vibe) d.vibe = f.vibe
    if (f.cost) d.cost = f.cost
    haptic.success(); create('idea', d); onClose(); setF({ title: '', emoji: '', vibe: null, cost: null })
  }
  return (
    <Sheet open={open} onClose={onClose} title="Нова ідея" footer={<Button block onClick={save} disabled={!f.title.trim()}>Додати в колесо</Button>}>
      <div className="form">
        <div className="row gap">
          <Field label="Емодзі"><input className="input center" style={{ width: 64 }} value={f.emoji} maxLength={4} onChange={(e) => set('emoji', e.target.value)} placeholder="🎡" /></Field>
          <Field label="Ідея" required><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Напр. пікнік на даху" /></Field>
        </div>
        <Field label="Настрій"><Chips value={f.vibe} onChange={(v) => set('vibe', v)} options={VIBES.map((v) => ({ ...v, toggle: true }))} /></Field>
        <Field label="Бюджет"><Chips value={f.cost} onChange={(v) => set('cost', v)} options={COSTS.map((v) => ({ ...v, toggle: true }))} /></Field>
      </div>
    </Sheet>
  )
}

function AiIdeas({ open, onClose, vibe, cost }) {
  const { call, create } = useStore()
  const [list, setList] = useState([])
  const [sel, setSel] = useState([])
  const [busy, setBusy] = useState(false)
  const gen = async () => {
    setBusy(true); setList([]); setSel([])
    haptic.medium()
    try {
      const r = await call('ai.ideas', { vibe: vibe || undefined, cost: cost || undefined, count: 6 })
      setList(r || []); setSel((r || []).map((_, i) => i))
      haptic.success()
    } catch (e) { toast(errText(e), 'error') } finally { setBusy(false) }
  }
  const save = async () => {
    const pick = sel.map((i) => list[i]).filter(Boolean)
    onClose()
    for (const it of pick) await create('idea', it).catch(() => {})
    if (pick.length) { burst({}); toast(`Додано ${pick.length} ідей у колесо ✨`, 'success') }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Ідеї від ШІ" subtitle="З урахуванням Риги й пори року"
      footer={list.length > 0 ? <Button block onClick={save} disabled={!sel.length}>Зберегти {sel.length}</Button> : null}>
      <OnOpen open={open} fn={gen} />
      {busy ? (
        <div className="stack-s">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div key={i} className="idea ai-skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
              <span className="idea-emoji shimmer-block" /><div className="grow"><Shimmer lines={2} /></div>
            </motion.div>
          ))}
          <p className="muted small center">Котик думає… 🐾</p>
        </div>
      ) : (
        <ul className="list">
          {list.map((it, i) => {
            const on = sel.includes(i)
            return (
              <motion.li key={i} className={`idea selectable ${on ? 'on' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.05 }}
                onClick={() => { haptic.select(); setSel(on ? sel.filter((x) => x !== i) : [...sel, i]) }}>
                <span className="idea-emoji">{it.emoji}</span>
                <div className="grow min0">
                  <b>{it.title}</b>
                  <div className="task-meta">
                    {it.vibe && <span className="tag">{vibeLbl(it.vibe)?.label}</span>}
                    {it.cost && <span className="tag tag-pink">{costLbl(it.cost)}</span>}
                  </div>
                </div>
                <Check on={on} onClick={() => { haptic.select(); setSel(on ? sel.filter((x) => x !== i) : [...sel, i]) }} />
              </motion.li>
            )
          })}
          {list.length > 0 && <Button variant="ghost" icon="refresh" onClick={gen} block>Інші ідеї</Button>}
        </ul>
      )}
    </Sheet>
  )
}

// запускає fn при кожному відкритті
function OnOpen({ open, fn }) {
  useEffect(() => { if (open) fn() }, [open]) // eslint-disable-line
  return null
}
