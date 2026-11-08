// Обгортка над Telegram WebApp: ініціалізація, хаптики, BackButton, safe-area
import { useEffect, useRef } from 'react'

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
export const inTelegram = !!tg?.initData

const can = (v) => !!tg?.isVersionAtLeast?.(v)

export function tgUser() {
  return tg?.initDataUnsafe?.user || null
}

export function initTelegram() {
  const root = document.documentElement
  const applyInsets = () => {
    const s = tg?.safeAreaInset || {}
    const c = tg?.contentSafeAreaInset || {}
    root.style.setProperty('--tg-top', `${(s.top || 0) + (c.top || 0)}px`)
    root.style.setProperty('--tg-bottom', `${(s.bottom || 0) + (c.bottom || 0)}px`)
  }
  applyInsets()
  if (!tg) return
  try {
    tg.ready()
    tg.expand()
    if (can('7.7')) tg.disableVerticalSwipes?.()
    if (can('6.1')) {
      tg.setHeaderColor('#0B0A0D')
      tg.setBackgroundColor('#0B0A0D')
    }
    if (can('7.10')) tg.setBottomBarColor?.('#0B0A0D')
    tg.onEvent?.('safeAreaChanged', applyInsets)
    tg.onEvent?.('contentSafeAreaChanged', applyInsets)
    tg.onEvent?.('viewportChanged', applyInsets)
  } catch (e) {
    console.warn('tg init', e)
  }
}

const H = () => (can('6.1') ? tg.HapticFeedback : null)
export const haptic = {
  tap: () => H()?.impactOccurred('light'),
  soft: () => H()?.impactOccurred('soft'),
  medium: () => H()?.impactOccurred('medium'),
  heavy: () => H()?.impactOccurred('heavy'),
  rigid: () => H()?.impactOccurred('rigid'),
  select: () => H()?.selectionChanged(),
  success: () => H()?.notificationOccurred('success'),
  warning: () => H()?.notificationOccurred('warning'),
  error: () => H()?.notificationOccurred('error'),
}

// ---- Стек «назад»: верхній обробник закриває шит / вкладений екран
const stack = []
let bound = false
function sync() {
  const bb = can('6.1') ? tg.BackButton : null
  if (!bb) return
  if (stack.length) bb.show()
  else bb.hide()
}
function onBack() {
  const top = stack[stack.length - 1]
  if (top) top.current?.()
}
function bind() {
  if (bound) return
  bound = true
  if (can('6.1')) tg.BackButton.onClick(onBack)
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') onBack() })
}

export function useBackButton(active, handler) {
  const ref = useRef(handler)
  useEffect(() => { ref.current = handler })
  useEffect(() => {
    if (!active) return
    bind()
    stack.push(ref)
    sync()
    return () => {
      const i = stack.lastIndexOf(ref)
      if (i >= 0) stack.splice(i, 1)
      sync()
    }
  }, [active])
}

export function shareLink(url, text) {
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  if (tg?.openTelegramLink && inTelegram) tg.openTelegramLink(share)
  else if (navigator.share) navigator.share({ url, text }).catch(() => {})
  else window.open(share, '_blank')
}

export function openLink(url) {
  if (inTelegram && tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank', 'noopener')
}

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
