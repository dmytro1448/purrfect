import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useStore, errText } from '../../lib/store.jsx'
import { useSignal } from '../../lib/hooks.js'
import { haptic } from '../../lib/telegram.js'
import { api, uploadImage } from '../../api/index.js'
import Icon from '../../components/Icon.jsx'
import Cat from '../../components/Cat.jsx'
import Sheet from '../../components/Sheet.jsx'
import WheelSheet from '../../components/WheelSheet.jsx'
import { Button, Chips, Empty, Field, Img, PhotoPicker, Shimmer, spring, softSpring } from '../../components/ui.jsx'
import { toast } from '../../components/Toast.jsx'

export const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((s) => String(s).trim()).filter(Boolean)
const FOOD = ['🍝', '🥗', '🍲', '🥞', '🍕', '🍣', '🥘', '🍰']
const foodEmoji = (t = '') => FOOD[[...t].reduce((a, c) => a + c.charCodeAt(0), 0) % FOOD.length]

export default function Recipes({ addSignal }) {
  const { byKind } = useStore()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState(null)
  const [open, setOpen] = useState(null)
  const [wheel, setWheel] = useState(false)
  const [edit, setEdit] = useState(null)
  useSignal(addSignal, () => setEdit({}))

  const all = byKind.recipe || []
  const tags = useMemo(() => [...new Set(all.flatMap((r) => r.data.tags || []))].slice(0, 12), [all])
  const list = all.filter((r) => (!tag || r.data.tags?.includes(tag)) && (!q || r.data.title.toLowerCase().includes(q.toLowerCase())))

  const pick = (r) => {
    setWheel(false)
    setOpen(r.id)
    setTimeout(() => document.getElementById('r-' + r.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 420)
  }

  return (
    <div className="stack-s">
      <motion.button className="card random-card" whileTap={{ scale: 0.98 }} onClick={() => { haptic.medium(); if (all.length < 2) { toast('Додайте хоча б 2 рецепти для колеса'); return } setWheel(true) }}>
        <div className="random-ico"><Icon name="dice" size={22} /></div>
        <div className="grow left">
          <b className="h3">Випадковий рецепт</b>
          <p className="muted small">Нехай колесо вирішить, що готуємо</p>
        </div>
        <div className="random-plates">
          {all.slice(0, 3).map((r) => <Img key={r.id} src={r.data.photo} emoji={foodEmoji(r.data.title)} className="plate" alt="" />)}
        </div>
      </motion.button>

      <div className="search">
        <Icon name="search" size={18} className="muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук страви…" />
        {q && <button className="row-x" onClick={() => setQ('')}><Icon name="x" size={16} /></button>}
      </div>
      {tags.length > 0 && <Chips wrap={false} value={tag} onChange={setTag} options={tags.map((t) => ({ value: t, label: t, toggle: true }))} />}

      {!all.length ? (
        <Empty title="Кулінарна книга порожня" text="Збережіть улюблені рецепти — і крутіть колесо, коли не знаєте, що готувати" action="Додати рецепт" onAction={() => setEdit({})}>
          <Cat state="eat" size={120} />
        </Empty>
      ) : !list.length ? (
        <p className="muted center pad">Нічого не знайшли 🙈</p>
      ) : (
        <motion.ul className="list" layout>
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((r) => <RecipeCard key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} onEdit={() => setEdit(r)} />)}
          </AnimatePresence>
        </motion.ul>
      )}

      <WheelSheet open={wheel} onClose={() => setWheel(false)} title="Що готуємо сьогодні?" resultLabel="Сьогодні готуємо"
        items={all.map((r) => ({ id: r.id, title: r.data.title, photo: r.data.photo, emoji: foodEmoji(r.data.title), sub: r.data.minutes ? `${r.data.minutes} хв` : '' }))}
        onPick={(r) => pick(r)} pickLabel="Відкрити рецепт" />
      <RecipeSheet recipe={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function RecipeCard({ r, open, onToggle, onEdit }) {
  const d = r.data
  const ing = lines(d.ingredients), steps = lines(d.steps)
  return (
    <motion.li layout id={'r-' + r.id} className={`card recipe ${open ? 'open' : ''}`} onClick={() => { haptic.tap(); onToggle() }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={spring}>
      <motion.div layout="position" className="recipe-top">
        <Img src={d.photo} emoji={foodEmoji(d.title)} className="recipe-img" alt={d.title} />
        <div className="grow min0">
          <b className="recipe-title">{d.title}</b>
          {d.description && <p className={`muted small ${open ? '' : 'clamp2'}`}>{d.description}</p>}
          <div className="task-meta">
            {d.minutes && <span className="tag"><Icon name="timer" size={11} />{d.minutes} хв</span>}
            {(d.tags || []).slice(0, 2).map((t) => <span key={t} className="tag tag-pink">{t}</span>)}
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="muted"><Icon name="chevronDown" size={18} /></motion.span>
      </motion.div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="recipe-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={softSpring}>
            {ing.length > 0 && <>
              <p className="eyebrow">Інгредієнти</p>
              <ul className="ing">{ing.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </>}
            {steps.length > 0 && <>
              <p className="eyebrow">Кроки</p>
              <ol className="steps">{steps.map((x, i) => <li key={i}><span>{i + 1}</span><p>{x}</p></li>)}</ol>
            </>}
            <div className="row gap mt">
              <Button variant="ghost" size="sm" icon="edit" onClick={(e) => { e.stopPropagation(); onEdit() }}>Редагувати</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function RecipeSheet({ recipe, onClose }) {
  const { create, update, remove } = useStore()
  const isEdit = !!recipe?.id
  const [f, setF] = useState({})
  const [ai, setAi] = useState(false)
  const [aiSrc, setAiSrc] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [up, setUp] = useState(false)
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  useEffect(() => {
    if (!recipe) return
    const d = recipe.data || {}
    setF({ title: d.title || '', photo: d.photo || '', description: d.description || '', minutes: d.minutes || '', tags: (d.tags || []).join(', '),
      ingredients: lines(d.ingredients).join('\n'), steps: lines(d.steps).join('\n') })
    setAi(false); setAiSrc('')
  }, [recipe])

  const fill = async () => {
    const s = aiSrc.trim()
    if (!s) return
    setAiBusy(true)
    haptic.medium()
    try {
      const isUrl = /^https?:\/\//i.test(s)
      const r = await api.call('ai.recipe', isUrl ? { url: s } : { text: s })
      setF((o) => ({
        ...o, title: r.title || o.title, description: r.description || o.description, minutes: r.minutes || o.minutes,
        tags: (r.tags || []).join(', ') || o.tags, ingredients: lines(r.ingredients).join('\n') || o.ingredients, steps: lines(r.steps).join('\n') || o.steps, photo: r.photo || o.photo,
      }))
      haptic.success()
      setAi(false)
      toast('Готово! Перевір і збережи ✨', 'success')
    } catch (e) {
      toast(errText(e), 'error')
    } finally {
      setAiBusy(false)
    }
  }

  const onPhoto = async (file) => {
    setUp(true)
    try { set('photo', await uploadImage(file)) } catch (e) { toast(errText(e), 'error') } finally { setUp(false) }
  }

  const save = () => {
    if (!f.title?.trim()) return
    const data = {
      title: f.title.trim(), photo: f.photo || null, description: f.description?.trim() || null, minutes: Number(f.minutes) || null,
      tags: f.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean), ingredients: f.ingredients?.trim() || null, steps: f.steps?.trim() || null,
    }
    onClose(); haptic.success()
    if (isEdit) update(recipe.id, { data })
    else create('recipe', Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)))
  }

  return (
    <Sheet open={!!recipe} onClose={onClose} title={isEdit ? 'Рецепт' : 'Новий рецепт'}
      footer={<div className="row gap">
        {isEdit && <Button variant="danger-ghost" icon="trash" onClick={() => { onClose(); remove(recipe.id) }} />}
        <Button block onClick={save} disabled={!f.title?.trim() || aiBusy}>{isEdit ? 'Зберегти' : 'Додати рецепт'}</Button>
      </div>}>
      <div className="form">
        <div className={`ai-box ${ai ? 'open' : ''}`}>
          {!ai ? (
            <button className="ai-btn" onClick={() => { haptic.tap(); setAi(true) }}>
              <span className="ai-spark"><Icon name="sparkles" size={18} /></span>
              <span className="grow left"><b>Заповнити з посилання або тексту</b><small>Встав лінк чи рецепт — решту зробить ШІ</small></span>
              <Icon name="chevronRight" size={16} />
            </button>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stack-s">
              <textarea className="input" rows={3} value={aiSrc} onChange={(e) => setAiSrc(e.target.value)} placeholder="https://… або встав текст рецепту" autoFocus disabled={aiBusy} />
              <div className="row gap">
                <Button variant="ghost" size="sm" onClick={() => setAi(false)} disabled={aiBusy}>Скасувати</Button>
                <Button size="sm" icon="sparkles" block onClick={fill} loading={aiBusy} disabled={!aiSrc.trim()}>{aiBusy ? 'Читаю рецепт…' : 'Заповнити'}</Button>
              </div>
            </motion.div>
          )}
        </div>

        {aiBusy ? (
          <div className="stack-s">
            <div className="shimmer-block" style={{ height: 120 }} />
            <Shimmer lines={2} /><Shimmer lines={4} /><Shimmer lines={3} />
          </div>
        ) : (
          <motion.div className="form" initial={false} animate={{ opacity: 1 }}>
            <PhotoPicker value={f.photo} onChange={onPhoto} uploading={up} label="Фото страви" />
            <Field label="Назва" required><input className="input" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Напр. Сирники" /></Field>
            <Field label="Опис"><textarea className="input" rows={2} value={f.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Коротко про страву" /></Field>
            <div className="row gap">
              <Field label="Хвилин"><input className="input" inputMode="numeric" value={f.minutes || ''} onChange={(e) => set('minutes', e.target.value.replace(/\D/g, ''))} placeholder="30" /></Field>
              <Field label="Теги"><input className="input" value={f.tags || ''} onChange={(e) => set('tags', e.target.value)} placeholder="вечеря, швидко" /></Field>
            </div>
            <Field label="Інгредієнти" hint="Кожен з нового рядка"><textarea className="input" rows={4} value={f.ingredients || ''} onChange={(e) => set('ingredients', e.target.value)} /></Field>
            <Field label="Кроки" hint="Кожен крок з нового рядка"><textarea className="input" rows={4} value={f.steps || ''} onChange={(e) => set('steps', e.target.value)} /></Field>
          </motion.div>
        )}
      </div>
    </Sheet>
  )
}
