import { useEffect, useState } from 'react'
import { useStore, errText } from '../lib/store.jsx'
import { api, isMock } from '../api/index.js'
import { haptic, shareLink } from '../lib/telegram.js'
import Icon from '../components/Icon.jsx'
import Cat from '../components/Cat.jsx'
import { Button, Field, Page } from '../components/ui.jsx'
import { toast } from '../components/Toast.jsx'
import { burst } from '../components/Confetti.jsx'

export default function Settings({ open, onClose }) {
  return (
    <Page open={open} onClose={onClose} title="Налаштування">
      <SettingsBody onClose={onClose} />
    </Page>
  )
}

function SettingsBody({ onClose }) {
  const { me, setMe, refetch } = useStore()
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  useEffect(() => {
    setF({ my_name: me.member.name, partner_name: me.partner?.name || '', name: me.couple.name, started_at: me.couple.started_at, cat_name: me.couple.cat.name })
  }, []) // eslint-disable-line

  const save = async () => {
    setBusy(true)
    try {
      const p = {}
      if (f.my_name !== me.member.name) p.my_name = f.my_name.trim()
      if (f.partner_name !== (me.partner?.name || '')) p.partner_name = f.partner_name.trim()
      if (f.name !== me.couple.name) p.name = f.name.trim()
      if (f.started_at !== me.couple.started_at) p.started_at = f.started_at
      if (f.cat_name !== me.couple.cat.name) p.cat_name = f.cat_name.trim()
      if (Object.keys(p).length) setMe(await api.call('couple.update', p))
      haptic.success(); toast('Збережено', 'success'); onClose()
    } catch (e) { toast(errText(e), 'error') } finally { setBusy(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(me.invite_link); haptic.success(); toast('Посилання скопійовано', 'success') } catch { toast('Не вдалося скопіювати', 'error') }
  }
  const mock = async (m) => {
    setBusy(true)
    try { setMe(await api.call(m)); await refetch(); if (m === 'mock.seed') { burst({}); toast('Демо-дані додано ✨', 'success') } onClose() } finally { setBusy(false) }
  }

  return (
    <div className="stack">
      <section className="card stack-s">
        <p className="eyebrow">Ми</p>
        <div className="row gap">
          <Field label="Моє імʼя"><input className="input" value={f.my_name || ''} onChange={(e) => set('my_name', e.target.value)} /></Field>
          <Field label="Партнер(ка)"><input className="input" value={f.partner_name || ''} onChange={(e) => set('partner_name', e.target.value)} /></Field>
        </div>
        <Field label="Назва пари"><input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Разом з"><input type="date" className="input" value={f.started_at || ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('started_at', e.target.value)} /></Field>
      </section>
      <section className="card row gap">
        <Cat size={84} state="happy" />
        <Field label="Імʼя котика"><input className="input" value={f.cat_name || ''} onChange={(e) => set('cat_name', e.target.value)} /></Field>
      </section>
      <Button block onClick={save} loading={busy}>Зберегти</Button>

      <section className="card stack-s">
        <p className="eyebrow">Запрошення</p>
        {me.couple.partner_joined || me.partner?.tg_id ? (
          <p className="row gap-s"><Icon name="check" size={16} className="pink" />{me.partner?.name} вже з вами — пару зʼєднано</p>
        ) : <p className="muted small">Надішли це посилання — щойно {me.partner?.name || 'партнер'} увійде, все стане спільним.</p>}
        <div className="invite-link">{me.invite_link?.replace('https://', '')}</div>
        <div className="row gap">
          <Button variant="ghost" icon="copy" block onClick={copy}>Копіювати</Button>
          <Button variant="ghost" icon="share" block onClick={() => shareLink(me.invite_link, 'Приєднуйся до нашої пари в Purrfect 💗')}>Поділитися</Button>
        </div>
        <p className="muted small">Код: <b className="tnum">{me.couple.invite_code}</b></p>
      </section>

      {isMock && (
        <section className="card stack-s">
          <p className="eyebrow">Демо-режим</p>
          <p className="muted small">Дані зберігаються лише в цьому браузері.</p>
          <div className="row gap">
            <Button variant="ghost" icon="sparkles" block onClick={() => mock('mock.seed')} disabled={busy}>Демо-дані</Button>
            <Button variant="danger-ghost" icon="trash" block onClick={() => mock('mock.reset')} disabled={busy}>Скинути все</Button>
          </div>
        </section>
      )}
      <p className="muted small center">Purrfect · зроблено з любовʼю 💗</p>
    </div>
  )
}
