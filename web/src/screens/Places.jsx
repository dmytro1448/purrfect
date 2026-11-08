import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, errText } from '../lib/store.jsx'
import { haptic, openLink } from '../lib/telegram.js'
import { uploadImage } from '../api/index.js'
import { fmtDateFull, todayISO, fmtDate } from '../lib/dates.js'
import Icon from '../components/Icon.jsx'
import Cat from '../components/Cat.jsx'
import Sheet from '../components/Sheet.jsx'
import PlacesMap from '../components/Map.jsx'
import { Button, Chips, Empty, Fab, Field, Img, PhotoPicker, Segmented, Stars, listV, itemV } from '../components/ui.jsx'
import { toast } from '../components/Toast.jsx'
import { burst } from '../components/Confetti.jsx'

const CATS = ['Кафе', 'Ресторан', 'Прогулянка', 'Природа', 'Їжа', 'Культура', 'Розваги', 'Подорож']
const CAT_EMO = { 'Кафе': '☕', 'Ресторан': '🍷', 'Прогулянка': '🚶', 'Природа': '🌲', 'Їжа': '🥐', 'Культура': '🎭', 'Розваги': '🎡', 'Подорож': '✈️' }

export default function Places() {
  const [seg, setSeg] = useState(() => sessionStorage.getItem('places-seg') || 'map')
  const [addPlace, setAddPlace] = useState(false)
  const [addDate, setAddDate] = useState(null)
  const set = (v) => { setSeg(v); try { sessionStorage.setItem('places-seg', v) } catch { /* */ } }
  return (
    <div className="stack">
      <div className="screen-head">
        <h1 className="h1">{seg === 'map' ? 'Наші місця' : 'Наша історія'}</h1>
        <Fab onClick={() => (seg === 'map' ? setAddPlace(true) : setAddDate({}))} />
      </div>
      <Segmented value={seg} onChange={set} options={[{ value: 'map', label: 'Місця', icon: 'map' }, { value: 'story', label: 'Наша історія', icon: 'route' }]} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={seg} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {seg === 'map' ? <PlacesTab onAdd={() => setAddPlace(true)} /> : <Story onAdd={() => setAddDate({})} onEdit={setAddDate} />}
        </motion.div>
      </AnimatePresence>
      <PlaceAdd open={addPlace} onClose={() => setAddPlace(false)} />
      <DateSheet item={addDate} onClose={() => setAddDate(null)} />
    </div>
  )
}

function PlacesTab({ onAdd }) {
  const { byKind } = useStore()
  const [filter, setFilter] = useState('all')
  const [sel, setSel] = useState(null)
  const [fly, setFly] = useState(null)
  const all = byKind.place || []
  const list = all.filter((p) => filter === 'all' || p.data.status === filter)
  const selItem = all.find((p) => p.id === sel)
  const counts = { been: all.filter((p) => p.data.status === 'been').length, want: all.filter((p) => p.data.status === 'want').length }

  return (
    <div className="stack-s">
      <Chips value={filter} onChange={(v) => setFilter(v)} options={[
        { value: 'all', label: `Усі · ${all.length}` }, { value: 'been', label: `Були · ${counts.been}`, icon: 'check' }, { value: 'want', label: `Хочемо · ${counts.want}`, icon: 'star' },
      ]} />
      <div className="map-card">
        <PlacesMap places={list} selected={sel} flyTo={fly} onSelect={(p) => { haptic.tap(); setSel(p.id) }} />
        <div className="map-legend"><span><i className="dot dot-been" />Були</span><span><i className="dot dot-want" />Хочемо</span></div>
      </div>
      {!list.length ? (
        <Empty title="Карта ще порожня" text="Відмічайте улюблені кав’ярні та місця, куди мрієте піти" action="Додати місце" onAction={onAdd}>
          <Cat state="idle" size={110} />
        </Empty>
      ) : (
        <motion.ul className="list" variants={listV} initial="hidden" animate="show">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((p) => (
              <motion.li layout variants={itemV} exit={{ opacity: 0, scale: 0.95 }} key={p.id} className={`place ${sel === p.id ? 'sel' : ''}`}
                onClick={() => { haptic.tap(); setSel(p.id); if (p.data.lat) setFly({ lat: p.data.lat, lng: p.data.lng, t: Date.now() }) }}>
                <Img src={p.data.photos?.[0]} emoji={CAT_EMO[p.data.category] || '📍'} className="place-img" alt="" seed={p.data.title} />
                <div className="grow min0">
                  <b className="ellipsis">{p.data.title}</b>
                  <div className="task-meta">
                    <span className={`tag ${p.data.status === 'been' ? 'tag-pink' : 'tag-violet'}`}>{p.data.status === 'been' ? 'Були' : 'Хочемо'}</span>
                    {p.data.category && <span className="tag">{p.data.category}</span>}
                  </div>
                  {p.data.rating > 0 && <Stars value={p.data.rating} size={12} />}
                </div>
                <Icon name="chevronRight" size={18} className="muted" />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
      <PlaceDetail p={selItem} onClose={() => setSel(null)} />
    </div>
  )
}

function PlaceDetail({ p, onClose }) {
  const { update, remove } = useStore()
  const d = p?.data || {}
  const markBeen = () => {
    haptic.success(); burst({ kind: 'hearts' })
    update(p.id, { data: { status: 'been', visited_at: todayISO() } })
  }
  return (
    <Sheet open={!!p} onClose={onClose} bare className="sheet-media">
      {p && (
        <div className="wish-detail">
          <Img src={d.photos?.[0]} emoji={CAT_EMO[d.category] || '📍'} className="wish-hero" alt={d.title} seed={d.title} />
          <div className="pad-x stack-s">
            <p className="eyebrow">{d.status === 'been' ? `Були${d.visited_at ? ' · ' + fmtDate(d.visited_at) : ''}` : 'Хочемо піти'}{d.category ? ` · ${d.category}` : ''}</p>
            <h2 className="h2">{d.title}</h2>
            {d.address && <p className="muted small row gap-xs"><Icon name="pin" size={14} />{d.address}</p>}
            {d.status === 'been' && <Stars value={d.rating || 0} onChange={(v) => update(p.id, { data: { rating: v } })} size={22} />}
            {d.note && <p className="note">{d.note}</p>}
            <div className="row gap wrap mt">
              {d.status === 'want' && <Button icon="check" onClick={markBeen}>Ми тут були!</Button>}
              {d.lat != null && <Button variant="ghost" icon="external" onClick={() => openLink(`https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`)}>Маршрут</Button>}
              <Button variant="danger-ghost" icon="trash" onClick={() => { onClose(); remove(p.id) }} />
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function PlaceAdd({ open, onClose }) {
  const { create } = useStore()
  const [f, setF] = useState({})
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [up, setUp] = useState(false)
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const t = useRef()
  useEffect(() => { if (open) { setF({ title: '', status: 'want', category: null, rating: 0, note: '', photos: [], pt: null, address: '' }); setQ(''); setResults([]) } }, [open])

  const search = (v) => {
    setQ(v)
    clearTimeout(t.current)
    if (v.trim().length < 3) { setResults([]); return }
    t.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=uk&q=${encodeURIComponent(v)}`)
        setResults(await r.json())
      } catch { setResults([]) } finally { setSearching(false) }
    }, 450)
  }
  const choose = (r) => {
    haptic.select()
    const name = r.name || r.display_name.split(',')[0]
    setF((o) => ({ ...o, pt: { lat: +(+r.lat).toFixed(6), lng: +(+r.lon).toFixed(6) }, title: o.title || name, address: r.display_name.split(',').slice(0, 3).join(',') }))
    setResults([]); setQ(name)
  }
  const onPhoto = async (file) => { setUp(true); try { const u = await uploadImage(file); set('photos', [u]) } catch (e) { toast(errText(e), 'error') } finally { setUp(false) } }
  const save = () => {
    if (!f.title.trim()) return
    const data = { title: f.title.trim(), status: f.status }
    if (f.pt) { data.lat = f.pt.lat; data.lng = f.pt.lng }
    if (f.address) data.address = f.address
    if (f.category) data.category = f.category
    if (f.status === 'been' && f.rating) data.rating = f.rating
    if (f.status === 'been') data.visited_at = todayISO()
    if (f.note) data.note = f.note
    if (f.photos?.length) data.photos = f.photos
    haptic.success(); onClose(); create('place', data); burst({ kind: 'hearts', count: 14 })
  }
  return (
    <Sheet open={open} onClose={onClose} title="Нове місце" footer={<Button block onClick={save} disabled={!f.title?.trim()}>Зберегти місце</Button>}>
      <div className="form">
        <Field label="Знайти на карті">
          <div className="search">
            <Icon name="search" size={18} className="muted" />
            <input value={q} onChange={(e) => search(e.target.value)} placeholder="Адреса або назва закладу" />
            {searching && <span className="spinner" />}
          </div>
          <AnimatePresence>
            {results.length > 0 && (
              <motion.ul className="geo-results" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {results.map((r) => <li key={r.place_id} onClick={() => choose(r)}><Icon name="pin" size={14} /><span className="clamp2">{r.display_name}</span></li>)}
              </motion.ul>
            )}
          </AnimatePresence>
        </Field>
        <div className="map-pick">
          {open && <PlacesMap pick={f.pt} onPick={(pt) => { haptic.select(); set('pt', pt) }} className="map-sm" />}
          {!f.pt && <div className="map-hint">Торкнись карти, щоб поставити пін</div>}
        </div>
        <Field label="Назва" required><input className="input" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Напр. Кав’ярня біля річки" /></Field>
        <Field label="Статус"><Segmented small value={f.status} onChange={(v) => set('status', v)} options={[{ value: 'want', label: 'Хочемо' }, { value: 'been', label: 'Були' }]} /></Field>
        <Field label="Категорія"><Chips value={f.category} onChange={(v) => set('category', v)} options={CATS.map((c) => ({ value: c, label: c, emoji: CAT_EMO[c], toggle: true }))} /></Field>
        {f.status === 'been' && <Field label="Оцінка"><Stars value={f.rating} onChange={(v) => set('rating', v)} size={26} /></Field>}
        <Field label="Нотатка"><textarea className="input" rows={2} value={f.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="Що сподобалось, що замовити…" /></Field>
        <PhotoPicker value={f.photos?.[0]} onChange={onPhoto} uploading={up} />
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------- історія
function Story({ onAdd, onEdit }) {
  const { byKind } = useStore()
  const list = (byKind.date || []).slice().sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
  const years = useMemo(() => {
    const m = new Map()
    list.forEach((d) => { const y = d.data.date?.slice(0, 4) || '—'; if (!m.has(y)) m.set(y, []); m.get(y).push(d) })
    return [...m.entries()]
  }, [list])
  if (!list.length) return (
    <Empty title="Історія тільки починається" text="Записуйте побачення й поїздки — з фото, щоб потім гортати разом" action="Додати подію" onAction={onAdd}>
      <Cat state="happy" size={110} />
    </Empty>
  )
  return (
    <div className="timeline">
      {years.map(([y, items]) => (
        <section key={y}>
          <div className="tl-year">{y}</div>
          <motion.ul variants={listV} initial="hidden" animate="show">
            {items.map((d) => (
              <motion.li key={d.id} variants={itemV} className="tl-item" onClick={() => { haptic.tap(); onEdit(d) }}>
                <div className={`tl-dot ${d.data.kind === 'trip' ? 'trip' : ''}`}><Icon name={d.data.kind === 'trip' ? 'plane' : 'heart'} size={13} fill={d.data.kind === 'trip' ? 'none' : 'currentColor'} /></div>
                <div className="tl-card card">
                  <p className="eyebrow">{fmtDateFull(d.data.date)} · {d.data.kind === 'trip' ? 'Поїздка' : 'Побачення'}</p>
                  <b className="tl-title">{d.data.title}</b>
                  {d.data.note && <p className="muted small">{d.data.note}</p>}
                  {d.data.photos?.length > 0 && (
                    <div className={`tl-photos n${Math.min(3, d.data.photos.length)}`}>
                      {d.data.photos.slice(0, 3).map((u, i) => <Img key={i} src={u} className="tl-photo" alt="" />)}
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      ))}
    </div>
  )
}

function DateSheet({ item, onClose }) {
  const { create, update, remove, byKind } = useStore()
  const isEdit = !!item?.id
  const [f, setF] = useState({})
  const [up, setUp] = useState(false)
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  useEffect(() => { if (item) setF({ title: '', date: todayISO(), kind: 'date', note: '', photos: [], place_id: null, ...(item.data || {}) }) }, [item])
  const onPhotos = async (files) => {
    setUp(true)
    try { const urls = await Promise.all(files.slice(0, 6).map(uploadImage)); set('photos', [...(f.photos || []), ...urls]) } catch (e) { toast(errText(e), 'error') } finally { setUp(false) }
  }
  const save = () => {
    if (!f.title?.trim()) return
    const data = { title: f.title.trim(), date: f.date, kind: f.kind, note: f.note || null, photos: f.photos, place_id: f.place_id || null }
    haptic.success(); onClose()
    if (isEdit) update(item.id, { data })
    else { create('date', Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null))); burst({}) }
  }
  const places = byKind.place || []
  return (
    <Sheet open={!!item} onClose={onClose} title={isEdit ? 'Подія' : 'Нова подія'} footer={<div className="row gap">
      {isEdit && <Button variant="danger-ghost" icon="trash" onClick={() => { onClose(); remove(item.id) }} />}
      <Button block onClick={save} disabled={!f.title?.trim()}>{isEdit ? 'Зберегти' : 'Додати в історію'}</Button>
    </div>}>
      <div className="form">
        <Segmented small value={f.kind} onChange={(v) => set('kind', v)} options={[{ value: 'date', label: 'Побачення', icon: 'heart' }, { value: 'trip', label: 'Поїздка', icon: 'plane' }]} />
        <Field label="Назва" required><input className="input" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder={f.kind === 'trip' ? 'Напр. Вікенд у Таллінні' : 'Напр. Вечеря на даху'} /></Field>
        <Field label="Дата"><input type="date" className="input" value={f.date || ''} onChange={(e) => set('date', e.target.value)} /></Field>
        {places.length > 0 && <Field label="Місце"><Chips wrap={false} value={f.place_id} onChange={(v) => set('place_id', v)} options={places.map((p) => ({ value: p.id, label: p.data.title, toggle: true }))} /></Field>}
        <Field label="Нотатка"><textarea className="input" rows={2} value={f.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="Що запамʼяталось найбільше?" /></Field>
        <Field label="Фото">
          <div className="photo-row">
            {(f.photos || []).map((u, i) => (
              <div key={i} className="photo-thumb"><img src={u} alt="" /><button onClick={() => set('photos', f.photos.filter((_, j) => j !== i))}><Icon name="x" size={12} /></button></div>
            ))}
            <PhotoPicker multiple onChange={onPhotos} uploading={up} label="Додати" />
          </div>
        </Field>
      </div>
    </Sheet>
  )
}
