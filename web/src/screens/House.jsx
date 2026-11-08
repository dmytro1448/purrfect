import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Fab, Segmented } from '../components/ui.jsx'
import Shop from './house/Shop.jsx'
import Tasks from './house/Tasks.jsx'
import Recipes from './house/Recipes.jsx'

export default function House() {
  const [seg, setSeg] = useState(() => sessionStorage.getItem('house-seg') || 'shop')
  const [add, setAdd] = useState(0)
  const set = (v) => { setSeg(v); try { sessionStorage.setItem('house-seg', v) } catch { /* */ } }
  return (
    <div className="stack">
      <div className="screen-head">
        <h1 className="h1">Дім</h1>
        <Fab onClick={() => setAdd((n) => n + 1)} />
      </div>
      <Segmented value={seg} onChange={set} options={[
        { value: 'shop', label: 'Покупки', icon: 'cart' },
        { value: 'tasks', label: 'Справи', icon: 'repeat' },
        { value: 'recipes', label: 'Рецепти', icon: 'chef' },
      ]} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={seg} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {seg === 'shop' && <Shop addSignal={add} />}
          {seg === 'tasks' && <Tasks addSignal={add} />}
          {seg === 'recipes' && <Recipes addSignal={add} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
