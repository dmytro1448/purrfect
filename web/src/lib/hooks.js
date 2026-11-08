import { useEffect, useRef } from 'react'

// Реагує на зміну лічильника-сигналу (кнопка «+» у заголовку), ігноруючи значення при монтуванні
export function useSignal(signal, fn) {
  const first = useRef(signal)
  const ref = useRef(fn)
  useEffect(() => { ref.current = fn })
  useEffect(() => {
    if (signal !== first.current) { first.current = signal; ref.current() }
  }, [signal])
}
