import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { useRef, useState } from 'react'
import { useStore, errText } from '../../lib/store.jsx'
import { haptic, useBackButton } from '../../lib/telegram.js'
import { uploadImage } from '../../api/index.js'
import { fmtDate, todayISO } from '../../lib/dates.js'
import Icon from '../../components/Icon.jsx'
import Cat from '../../components/Cat.jsx'
import { Button, Empty, IconButton } from '../../components/ui.jsx'
import { toast } from '../../components/Toast.jsx'

export default function Album() {
  const { byKind, create } = useStore()
  const [view, setView] = useState(null)
  const [up, setUp] = useState(0)
  const input = useRef()
  const list = (byKind.photo || []).slice().sort((a, b) => ((a.data.taken_at || a.created_at) < (b.data.taken_at || b.created_at) ? 1 : -1))

  const onFiles = async (files) => {
    setUp(files.length)
    for (const f of files) {
      try {
        const url = await uploadImage(f)
        await create('photo', { url, taken_at: todayISO() })
      } catch (e) { toast(errText(e), 'error') }
      setUp((n) => n - 1)
    }
    haptic.success()
  }

  return (
    <div className="stack">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) onFiles(f) }} />
      <Button icon="upload" block onClick={() => input.current.click()} loading={up > 0}>{up > 0 ? `Завантажую ${up}…` : 'Додати фото'}</Button>
      {!list.length ? (
        <Empty title="Альбом порожній" text="Збирайте тут найтепліші кадри — разом, без загублених чатів">
          <Cat state="happy" size={110} />
        </Empty>
      ) : (
        <div className="masonry">
          {list.map((p, i) => (
            <motion.button key={p.id} className="masonry-item" onClick={() => { haptic.tap(); setView(i) }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
              whileTap={{ scale: 0.97 }}>
              <img src={p.data.url} alt={p.data.caption || ''} loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
              {p.data.caption && <span className="masonry-cap">{p.data.caption}</span>}
            </motion.button>
          ))}
        </div>
      )}
      <Viewer list={list} index={view} setIndex={setView} />
    </div>
  )
}

function Viewer({ list, index, setIndex }) {
  return createPortal(
    <AnimatePresence>{index !== null && list[index] && <ViewerIn key="v" list={list} index={index} setIndex={setIndex} />}</AnimatePresence>,
    document.body,
  )
}

function ViewerIn({ list, index, setIndex }) {
  const { remove } = useStore()
  const [dir, setDir] = useState(0)
  const close = () => setIndex(null)
  useBackButton(true, close)
  const go = (d) => {
    const n = index + d
    if (n < 0 || n >= list.length) return
    haptic.select(); setDir(d); setIndex(n)
  }
  const p = list[index]
  return (
    <motion.div className="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="viewer-top">
        <span className="muted small tnum">{index + 1} / {list.length}</span>
        <div className="row gap-s">
          <IconButton icon="trash" label="Видалити" onClick={() => { const id = p.id; if (list.length <= 1) close(); else if (index >= list.length - 1) setIndex(index - 1); remove(id) }} />
          <IconButton icon="x" label="Закрити" onClick={close} />
        </div>
      </div>
      <div className="viewer-stage">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img key={p.id} src={p.data.url} alt="" className="viewer-img" custom={dir}
            variants={{ enter: (d) => ({ x: d * 300, opacity: 0, scale: 0.96 }), center: { x: 0, opacity: 1, scale: 1 }, exit: (d) => ({ x: d * -300, opacity: 0, scale: 0.96 }) }}
            initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
            onDragEnd={(_, i) => { if (i.offset.x < -70 || i.velocity.x < -400) go(1); else if (i.offset.x > 70 || i.velocity.x > 400) go(-1) }}
            draggable={false} />
        </AnimatePresence>
      </div>
      <div className="viewer-cap">
        {p.data.caption && <b>{p.data.caption}</b>}
        {p.data.taken_at && <span className="muted small">{fmtDate(p.data.taken_at)}</span>}
      </div>
      <div className="viewer-dots">
        {list.slice(0, 20).map((x, i) => <span key={x.id} className={i === index ? 'on' : ''} />)}
      </div>
      <button className="viewer-nav l" onClick={() => go(-1)} aria-label="Попереднє"><Icon name="chevronLeft" size={22} /></button>
      <button className="viewer-nav r" onClick={() => go(1)} aria-label="Наступне"><Icon name="chevronRight" size={22} /></button>
    </motion.div>
  )
}
