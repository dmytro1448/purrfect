// Leaflet-карта з темними тайлами CARTO і рожевими пінами
import { useEffect, useRef } from 'react'
import L from 'leaflet'

// CARTO dark_all тепер вимагає API-ключ (повертає заглушку «API KEY REQUIRED»).
// Тому за замовчуванням — OSM-тайли, затемнені CSS-фільтром (клас .map-osm). Свій темний
// провайдер (напр. CARTO з ключем) можна задати через VITE_TILES_URL — тоді фільтр не застосовується.
const CUSTOM = import.meta.env.VITE_TILES_URL
const TILES = CUSTOM || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const RIGA = [56.9496, 24.1052]

const pinIcon = (status, active) => L.divIcon({
  className: '',
  html: `<div class="pin ${status === 'want' ? 'pin-want' : ''} ${active ? 'pin-active' : ''}"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>`,
  iconSize: [34, 42], iconAnchor: [17, 40],
})

export default function PlacesMap({ places = [], onSelect, selected, pick, onPick, className = '', flyTo }) {
  const el = useRef(), map = useRef(), layer = useRef(), pickMarker = useRef()
  const fitKey = useRef('')
  const onPickRef = useRef(onPick), onSelectRef = useRef(onSelect)
  useEffect(() => { onPickRef.current = onPick; onSelectRef.current = onSelect })

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, center: pick ? [pick.lat, pick.lng] : RIGA, zoom: pick ? 14 : 11 })
    L.tileLayer(TILES, { subdomains: 'abcd', maxZoom: 19, attribution: CUSTOM ? '© OpenStreetMap © CARTO' : '© OpenStreetMap' }).addTo(m)
    m.attributionControl.setPrefix(false)
    layer.current = L.layerGroup().addTo(m)
    m.on('click', (e) => onPickRef.current?.({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }))
    map.current = m
    setTimeout(() => { if (map.current === m) m.invalidateSize() }, 250)
    return () => { m.remove(); map.current = null; fitKey.current = ''; pickMarker.current = null }
  }, []) // eslint-disable-line

  // піни місць
  useEffect(() => {
    const m = map.current
    if (!m || onPick) return
    layer.current.clearLayers()
    const pts = places.filter((p) => p.data.lat != null && p.data.lng != null)
    pts.forEach((p) => {
      const mk = L.marker([p.data.lat, p.data.lng], { icon: pinIcon(p.data.status, selected === p.id) })
      mk.on('click', () => onSelectRef.current?.(p))
      layer.current.addLayer(mk)
    })
    const key = pts.map((p) => p.id).join(',')
    if (pts.length && key !== fitKey.current) {
      fitKey.current = key
      const b = L.latLngBounds(pts.map((p) => [p.data.lat, p.data.lng]))
      m.fitBounds(b, { padding: [36, 36], maxZoom: 13, animate: false })
      setTimeout(() => { if (map.current === m) { m.invalidateSize(); m.fitBounds(b, { padding: [36, 36], maxZoom: 13 }) } }, 320)
    }
  }, [places, selected]) // eslint-disable-line

  useEffect(() => {
    if (flyTo && map.current) map.current.flyTo([flyTo.lat, flyTo.lng], 15, { duration: 0.8 })
  }, [flyTo])

  // режим вибору точки
  useEffect(() => {
    const m = map.current
    if (!m || !onPick) return
    if (pick) {
      if (!pickMarker.current) pickMarker.current = L.marker([pick.lat, pick.lng], { icon: pinIcon('been', true) }).addTo(m)
      else pickMarker.current.setLatLng([pick.lat, pick.lng])
      m.flyTo([pick.lat, pick.lng], Math.max(m.getZoom(), 15), { duration: 0.6 })
    }
  }, [pick?.lat, pick?.lng]) // eslint-disable-line

  return <div ref={el} className={`map ${CUSTOM ? '' : 'map-osm'} ${className}`} />
}
