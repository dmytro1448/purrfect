// Глобальний стан: me + items, оптимістичні мутації, realtime-підписка
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, isMock, subscribeCouple } from '../api/index.js'
import { toast } from '../components/Toast.jsx'
import { tgUser } from './telegram.js'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const ERR = {
  network: 'Немає звʼязку. Спробуй ще раз',
  already_opened_today: 'Сьогодні записку вже відкрито — завтра буде нова 💌',
  not_hungry: 'Котик ще ситий — повертайся трохи згодом',
  bad_code: 'Код не підходить. Перевір і спробуй ще',
}
export const errText = (e) => ERR[e?.message] || 'Щось пішло не так. Спробуй ще раз'

export function DataProvider({ children }) {
  const [me, setMe] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pending = useRef(0)

  const refetch = useCallback(async () => {
    try {
      const m = await api.call('me')
      const u = tgUser()
      if (m?.member && !m.member.avatar_url && u?.photo_url) m.member.avatar_url = u.photo_url
      setMe(m)
      if (m?.couple) {
        const list = await api.call('items.list', {})
        if (!pending.current) setItems(list || [])
      } else setItems([])
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const coupleId = me?.couple?.id
  useEffect(() => {
    if (!coupleId) return
    let off = () => {}
    let alive = true
    subscribeCouple(coupleId, refetch).then((f) => { if (alive) off = f; else f() })
    const onVis = () => { if (document.visibilityState === 'visible') refetch() }
    document.addEventListener('visibilitychange', onVis)
    const onStorage = (e) => { if (isMock && e.key?.startsWith('purrfect')) refetch() }
    window.addEventListener('storage', onStorage)
    return () => { alive = false; off(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('storage', onStorage) }
  }, [coupleId, refetch])

  const track = async (p) => {
    pending.current++
    try { return await p } finally { pending.current-- }
  }

  const refreshMe = useCallback(async () => {
    try { setMe(await api.call('me')) } catch { /* тихо */ }
  }, [])

  const create = useCallback(async (kind, data) => {
    const tmp = { id: 'tmp_' + Math.random().toString(36).slice(2), kind, data, done: false, created_by: me?.member?.tg_id, created_at: new Date().toISOString(), _tmp: true }
    setItems((l) => [tmp, ...l])
    try {
      const it = await track(api.call('items.create', { kind, data }))
      setItems((l) => l.map((x) => (x.id === tmp.id ? it : x)))
      refreshMe()
      return it
    } catch (e) {
      setItems((l) => l.filter((x) => x.id !== tmp.id))
      toast(errText(e), 'error')
      throw e
    }
  }, [me, refreshMe]) // eslint-disable-line

  const update = useCallback(async (id, patch) => {
    let prev
    setItems((l) => l.map((x) => {
      if (x.id !== id) return x
      prev = x
      return { ...x, ...(patch.done !== undefined ? { done: patch.done } : {}), data: patch.data ? { ...x.data, ...patch.data } : x.data }
    }))
    try {
      const it = await track(api.call('items.update', { id, ...patch }))
      setItems((l) => l.map((x) => (x.id === id ? it : x)))
      if (patch.done !== undefined) refreshMe()
      return it
    } catch (e) {
      if (prev) setItems((l) => l.map((x) => (x.id === id ? prev : x)))
      toast(errText(e), 'error')
      throw e
    }
  }, []) // eslint-disable-line

  const remove = useCallback(async (id) => {
    let prev, idx
    setItems((l) => { idx = l.findIndex((x) => x.id === id); prev = l[idx]; return l.filter((x) => x.id !== id) })
    try {
      await track(api.call('items.delete', { id }))
    } catch (e) {
      if (prev) setItems((l) => { const c = [...l]; c.splice(idx, 0, prev); return c })
      toast(errText(e), 'error')
    }
  }, [])

  const setCat = useCallback((cat) => setMe((m) => (m ? { ...m, couple: { ...m.couple, cat } } : m)), [])

  const call = useCallback(async (method, params) => api.call(method, params), [])

  const byKind = useMemo(() => {
    const o = {}
    for (const it of items) (o[it.kind] ||= []).push(it)
    return o
  }, [items])

  const value = {
    me, setMe, items, byKind, loading, error, refetch, refreshMe, create, update, remove, setCat, call,
    myId: me?.member?.tg_id, partner: me?.partner, couple: me?.couple,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// хелпер для імені/кольору учасника
export function useMembers() {
  const { me } = useStore()
  return useMemo(() => {
    const map = {}
    if (me?.member) map[me.member.tg_id] = { ...me.member, self: true }
    if (me?.partner?.tg_id) map[me.partner.tg_id] = me.partner
    return map
  }, [me])
}
