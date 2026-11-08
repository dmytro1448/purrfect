import { useStore, useMembers } from '../lib/store.jsx'
import { Avatar } from './ui.jsx'

// Хто робить: 'both' | tg_id
export function Who({ who, size = 24 }) {
  const { me } = useStore()
  const members = useMembers()
  if (who === 'both' || who == null) {
    return (
      <span className="who-both" title="Спільне">
        <Avatar member={me.member} size={size} />
        <Avatar member={me.partner || { name: '?' }} size={size} />
      </span>
    )
  }
  return <Avatar member={members[who] || { name: '?' }} size={size} />
}

export function useWhoOptions(meLabel = 'Я') {
  const { me } = useStore()
  const p = me.partner
  return [
    { value: 'both', label: 'Спільне', icon: 'users' },
    { value: me.member.tg_id, label: meLabel, icon: 'user' },
    { value: p?.tg_id ?? 'partner', label: p?.name || 'Партнер', icon: 'heart', disabled: !p?.tg_id },
  ]
}
