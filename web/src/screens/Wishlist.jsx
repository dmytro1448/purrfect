import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useStore, errText } from '../lib/store.jsx'
import { haptic, openLink } from '../lib/telegram.js'
import { api, uploadImage } from '../api/index.js'
import Icon from '../components/Icon.jsx'
import Cat from '../components/Cat.jsx'
import Sheet from '../components/Sheet.jsx'
import { Avatar, Button, Chips, Empty, Fab, Field, Img, PhotoPicker, Segmented, spring, listV, itemV } from '../components/ui.jsx'
import { toast } from '../components/Toast.jsx'
import { burstFrom } from '../components/Confetti.jsx'

const LISTS = [
  { value: 'gift', label: 'Подарунки', icon: 'gift' },
  { value: 'watch', label: 'Подивитись', icon: 'eye' },
  { value: 'dream', label: 'Мрії', icon: 'sparkles' },
]
const EMO = { gift: '🎁', watch: '🎬', dream: '🌙' }
const priceText = (p) => (p == null || p === '' ? '' : typeof p === 'number' ? `${p.toLocaleString('uk-UA')} ₴` : p)

export default function Wishlist() {
  const { byKind, me, myId } = useStore()
  const [list, setList] = useState('gift')
  const [owner, setOwner] = useState('me')
  const [sel, setSel] = useState(null)
  const [add, setAdd] = useState(false)
  const partner = me.partner
  const pending = !partner?.tg_id

  const all = (byKind.wish || []).filter((w) => w.data.list === list)
  const shown = list === 'dream' ? all : all.filter((w) => (owner === 'me' ? w.data.owner === myId : w.data.owner !== myId))
  const selItem = sel && (byKind.wish || []).find((w) => w.id === sel)

  return (
    <div className="stack">
      <div className="screen-head">
        <h1 className="h1">Наш вішліст</h1>
        <Fab onClick={() => setAdd(true)} />
      </div>
      <Segmented value={list} onChange={setList} options={LISTS} />
      {list !== 'dream' && (
        <div className="owner-switch">
          {[{ v: 'me', m: me.member, l: 'Хочу я' }, { v: 'partner', m: partner, l: `Хоче ${partner?.name || 'партнер'}` }].map((o) => (
            <motion.button key={o.v} whileTap={{ scale: 0.96 }} disabled={o.v === 'partner' && pending}
              className={`owner-btn ${owner === o.v ? 'on' : ''}`} onClick={() => { haptic.select(); setOwner(o.v) }}>
              {owner === o.v && <motion.span layoutId="owner-pill" className="owner-pill" transition={spring} />}
              <Avatar member={o.m || { name: '?' }} size={24} /><span>{o.l}</span>
            </motion.button>
          ))}
        </div>
      )}
      {list === 'gift' && (
        <div className="privacy">
          <Icon name="lock" size={15} /><span>Підготовку подарунка бачить лише той, хто дарує</span>
        </div>
      )}

      {!shown.length ? (
        <Empty title={list === 'dream' ? 'Мрій ще немає' : owner === 'me' ? 'Тут поки порожньо' : `${partner?.name || 'Партнер'} ще нічого не додав(ла)`}
          text={list === 'gift' ? 'Додай те, що хочеш отримати — посилання підтягне фото й ціну' : list === 'watch' ? 'Фільми й серіали на спільні вечори' : 'Великі мрії, до яких ідемо разом'}
          action={owner === 'me' || list === 'dream' ? 'Додати' : null} onAction={() => setAdd(true)}>
          <Cat state={owner === 'me' ? 'idle' : 'sleep'} size={110} />
        </Empty>
      ) : (
        <motion.div key={list + owner} className={list === 'dream' ? 'dream-list' : 'wish-grid'} variants={listV} initial="hidden" animate="show">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((w) => <WishCard key={w.id} w={w} big={list === 'dream'} onOpen={() => { haptic.tap(); setSel(w.id) }} />)}
          </AnimatePresence>
        </motion.div>
      )}

      <WishDetail w={selItem} onClose={() => setSel(null)} />
      <WishAdd open={add} onClose={() => setAdd(false)} list={list} owner={list === 'dream' ? 'me' : owner} />
    </div>
  )
}

function WishCard({ w, big, onOpen }) {
  const { myId } = useStore()
  const d = w.data
  const mineGift = d.reserved_by === myId && d.owner !== myId
  return (
    <motion.button layout variants={itemV} exit={{ opacity: 0, scale: 0.9 }} whileTap={{ scale: 0.97 }} className={`wish ${big ? 'wish-big' : ''}`} onClick={onOpen}>
      <Img src={d.image} emoji={d.emoji || EMO[d.list]} className="wish-img" alt={d.title} seed={d.title} />
      {mineGift && <span className="wish-flag"><Icon name="gift" size={12} />Ти даруєш</span>}
      <div className="wish-body">
        <b className="clamp2">{d.title}</b>
        {priceText(d.price) && <span className="wish-price">{priceText(d.price)}</span>}
        {!priceText(d.price) && d.note && <span className="muted small clamp1">{d.note}</span>}
      </div>
    </motion.button>
  )
}

function WishDetail({ w, onClose }) {
  const { myId, update, remove, me } = useStore()
  const [note, setNote] = useState('')
  useEffect(() => { if (w) setNote(w.data.prep_note || '') }, [w?.id]) // eslint-disable-line
  const d = w?.data || {}
  const mine = d.owner === myId
  const reserved = d.reserved_by === myId
  const ownerName = mine ? 'ти' : me.partner?.name
  const toggleReserve = (e) => {
    const el = e.currentTarget
    if (!reserved) { haptic.success(); burstFrom(el, { kind: 'hearts' }) } else haptic.tap()
    update(w.id, { data: { reserved_by: reserved ? null : myId } })
  }
  return (
    <Sheet open={!!w} onClose={onClose} bare className="sheet-media">
      {w && (
        <div className="wish-detail">
          <Img src={d.image} emoji={d.emoji || EMO[d.list]} className="wish-hero" alt={d.title} seed={d.title} />
          <div className="pad-x stack-s">
            <p className="eyebrow">{d.list === 'gift' ? `Хоче ${ownerName}` : d.list === 'watch' ? 'Подивитись' : 'Мрія'}</p>
            <h2 className="h2">{d.title}</h2>
            <div className="row gap-s wrap">
              {priceText(d.price) && <span className="wish-price big">{priceText(d.price)}</span>}
              {d.url && <Button variant="ghost" size="sm" icon="external" onClick={() => openLink(d.url)}>Відкрити посилання</Button>}
            </div>
            {d.note && <p className="note">{d.note}</p>}

            {!mine && d.list === 'gift' && (
              <div className="reserve-box">
                <div className="row gap-s"><Icon name="lock" size={14} /><span className="small muted">Це бачиш лише ти</span></div>
                <Button block variant={reserved ? 'ghost' : 'primary'} icon={reserved ? 'check' : 'gift'} onClick={toggleReserve}>
                  {reserved ? 'Ти даруєш це · скасувати' : 'Я подарую'}
                </Button>
                <AnimatePresence>
                  {reserved && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Field label="Приватна нотатка">
                        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (d.prep_note || '') && update(w.id, { data: { prep_note: note } })} placeholder="Розмір, де купити, коли…" />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {(mine || d.list !== 'gift') && (
              <div className="row gap mt">
                <Button variant="danger-ghost" icon="trash" onClick={() => { onClose(); remove(w.id) }}>Видалити</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}

function WishAdd({ open, onClose, list, owner }) {
  const { create, myId, me } = useStore()
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  useEffect(() => { if (open) setF({ list, owner: owner === 'partner' && me.partner?.tg_id ? me.partner.tg_id : myId, url: '', title: '', price: '', image: '', note: '' }) }, [open]) // eslint-disable-line

  const preview = async () => {
    if (!/^https?:\/\//.test(f.url)) { toast('Встав повне посилання (https://…)'); return }
    setBusy(true)
    try {
      const p = await api.call('link.preview', { url: f.url })
      setF((o) => ({ ...o, title: o.title || p.title || '', image: p.image || o.image, price: o.price || (p.price ?? '') }))
      haptic.success()
    } catch (e) { toast(errText(e), 'error') } finally { setBusy(false) }
  }
  const onPhoto = async (file) => { setUp(true); try { set('image', await uploadImage(file)) } catch (e) { toast(errText(e), 'error') } finally { setUp(false) } }
  const save = () => {
    if (!f.title.trim()) return
    const data = { title: f.title.trim(), list: f.list, owner: f.owner }
    if (f.url) data.url = f.url
    if (f.image) data.image = f.image
    if (f.price) data.price = f.price
    if (f.note) data.note = f.note
    haptic.success(); onClose(); create('wish', data)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Нове бажання" footer={<Button block onClick={save} disabled={!f.title?.trim()}>Додати</Button>}>
      <div className="form">
        <Field label="Список"><Chips value={f.list} onChange={(v) => set('list', v)} options={LISTS} /></Field>
        {f.list !== 'dream' && (
          <Field label="Чиє бажання">
            <Chips value={f.owner} onChange={(v) => set('owner', v)} options={[
              { value: myId, label: 'Хочу я' },
              { value: me.partner?.tg_id ?? 'p', label: `Хоче ${me.partner?.name || 'партнер'}`, disabled: !me.partner?.tg_id },
            ]} />
          </Field>
        )}
        <Field label="Посилання" hint="Підтягнемо назву, фото й ціну">
          <div className="input-row">
            <input className="input" value={f.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://…" inputMode="url" />
            <Button variant="ghost" size="sm" onClick={preview} loading={busy} disabled={!f.url}>Підтягнути</Button>
          </div>
        </Field>
        <PhotoPicker value={f.image} onChange={onPhoto} uploading={up} />
        <Field label="Назва" required><input className="input" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder={f.list === 'watch' ? 'Напр. Амелі' : 'Напр. Навушники'} /></Field>
        {f.list === 'gift' && <Field label="Ціна"><input className="input" value={f.price || ''} onChange={(e) => set('price', e.target.value)} placeholder="Напр. 2 500 ₴" /></Field>}
        <Field label="Нотатка"><textarea className="input" rows={2} value={f.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="Колір, розмір, чому хочеться…" /></Field>
      </div>
    </Sheet>
  )
}
