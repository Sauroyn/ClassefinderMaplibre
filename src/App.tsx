import { useEffect, useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView'
import LevelSelector from './components/LevelSelector'
import SearchBar from './components/SearchBar'
import RoutePlanner from './components/RoutePlanner'
import ConfigSelector from './components/ConfigSelector'
import SettingsButton from './components/SettingsButton'
import EventSelector, { type SimpleEvent } from './components/EventSelector'
import { fetchICSEvents, filterNextWeek } from './utils/ical'
import { computeRouteTime, computeAndDrawRoute } from './map/computeRoute'
import { loadGraphFromConfigOrFallback } from './utils/graph'
const CONFIG_STORAGE_KEY = 'site_config_file'
const ICAL_URL_KEY = 'cf:ical_url'
const TRAVEL_BUFFER_MIN_KEY = 'cf:travel_buffer_min'
const EVENTS_ENABLED_KEY = 'cf:events_enabled'

export default function App() {
  const [levels, setLevels] = useState<number[]>([])
  const [level, setLevel] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const dataRef = useRef<any | null>(null)
  const mapRef = useRef<any>(null)
  const prevCameraRef = useRef<any>(null)
  const [showPlanner, setShowPlanner] = useState(false)
  const [plannerDest, setPlannerDest] = useState<any | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [icalUrl, setIcalUrl] = useState<string>(() => {
    try { return localStorage.getItem(ICAL_URL_KEY) || '' } catch { return '' }
  })
  const [bufferMin, setBufferMin] = useState<number>(() => {
    try { const v = Number(localStorage.getItem(TRAVEL_BUFFER_MIN_KEY) || '10'); return Number.isFinite(v) ? v : 10 } catch { return 10 }
  })
  const [events, setEvents] = useState<SimpleEvent[]>([])
  const graphRef = useRef<any | null>(null)
  const [eventsEnabled, setEventsEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem(EVENTS_ENABLED_KEY); return v == null ? true : v === '1' } catch { return true }
  })
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [plannerStart, setPlannerStart] = useState<{ id: string, name: string } | null>(null)
  const [plannerEnd, setPlannerEnd] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    ; (async () => {
      // default
      let geoUrl = (import.meta.env && (import.meta.env.BASE_URL || '/')) + 'buildings.geojson'
      try {
        const sel = (typeof window !== 'undefined') ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
        if (sel) {
          // fetch config from public/configs
          try {
            const base = (import.meta.env && (import.meta.env.BASE_URL || '/'))
            const r = await fetch(base + 'configs/' + sel)
            if (r.ok) {
              const parsed = await r.json()
              if (parsed.geojson && typeof parsed.geojson === 'string') {
                geoUrl = base + String(parsed.geojson).replace(/^\//, '')
              }
            }
          } catch (e) { }
        }
      } catch (e) { }
      try {
        const r = await fetch(geoUrl)
        const d = await r.json()
        dataRef.current = d
        const found = Array.from(new Set((d.features || []).map((f: any) => f.properties?.level))).filter(Boolean) as number[]
        found.sort((a, b) => a - b)
        setLevels(found)
        setLoading(false)
        if (found.length) setLevel(found[0])
      } catch (e) {
        console.warn('failed loading geojson', e)
        setLoading(false)
      }
    })()
  }, [])

  // Load graph once for background computations
  useEffect(() => {
    (async () => { graphRef.current = await loadGraphFromConfigOrFallback() })()
  }, [])

  // Fetch and parse ICS when URL available; precompute travel times (only when feature enabled)
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!eventsEnabled) { setEvents([]); return }
      if (!icalUrl) { setEvents([]); return }
      try {
        const raw = await fetchICSEvents(icalUrl)
        const next = filterNextWeek(raw)
        // Map to SimpleEvent with validation
        const simple: SimpleEvent[] = next.map((e, idx) => {
          const issues: string[] = []
          if (!e.location) issues.push('Localisation manquante')
          if (!e.summary) issues.push('Titre manquant')
          if (!e.dtstart) issues.push('Début manquant')
          if (!e.dtend) issues.push('Fin manquante')
          const start = e.dtstart ?? null
          const end = e.dtend ?? null
          const dayKey = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString().slice(0, 10) : 'invalid'
          return { id: e.uid || String(idx), title: e.summary ?? null, location: e.location ?? null, start, end, dayKey, issues }
        })
        // Sort chronologically
        simple.sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0))
        // Precompute travel times between consecutive events of same day using graph nodes by location name
        // Strategy: we assume graph node names correspond to map building names; we'll attempt to find a node id by case-insensitive match on name
        const g = graphRef.current
        const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
        const nodeByName = new Map<string, any>()
        if (g && g.nodes) {
          for (const n of g.nodes) {
            const nm = normalize(String(n.name ?? n.id ?? ''))
            if (nm) nodeByName.set(nm, n)
          }
        }
        // helpers to resolve a location to node id string (with fallback via buildings.geojson names)
        const nearestNodeToCoord = (coord: [number, number]) => {
          if (!g || !g.nodes) return null as string | null
          let best: { id: string, d: number } | null = null
          const toRad = (v: number) => v * Math.PI / 180
          const hav = (a: [number, number], b: [number, number]) => {
            const R = 6371000
            const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
            const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
            const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
            const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
            return R * c
          }
          for (const n of g.nodes) {
            const d = hav(coord, n.coord as [number, number])
            if (!best || d < best.d) best = { id: String(n.id), d }
          }
          return best ? best.id : null
        }
        const featureCenter = (geom: any): [number, number] | null => {
          if (!geom) return null
          try {
            if (geom.type === 'Point') return geom.coordinates as [number, number]
            const push = (arr: number[][], coords: any) => { for (const c of coords) arr.push(c as number[]) }
            let all: number[][] = []
            if (geom.type === 'Polygon') push(all, geom.coordinates.flat())
            else if (geom.type === 'MultiPolygon') push(all, geom.coordinates.flat(2))
            else if (geom.type === 'LineString') all = geom.coordinates
            else if (geom.type === 'MultiLineString') all = geom.coordinates.flat()
            if (all.length === 0) return null
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const c of all) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
            return [(minX + maxX) / 2, (minY + maxY) / 2]
          } catch { return null }
        }
        const resolveLoc = (loc: string | null): string | null => {
          if (!loc) return null
          const key = normalize(String(loc))
          const n = nodeByName.get(key)
          if (n) return String(n.id)
          // fallback: try buildings geojson name match, then pick nearest node to feature center
          const data = dataRef.current
          try {
            const feats = (data && data.features) ? data.features : []
            const byName: Array<{ f: any, n: string }> = feats.filter((f: any) => f?.properties?.name).map((f: any) => ({ f, n: normalize(String(f.properties.name)) }))
            let found = byName.find((x: { f: any, n: string }) => x.n === key)
            if (!found) {
              // loose contains match if unique
              const candidates = byName.filter((x: { f: any, n: string }) => x.n.includes(key) || key.includes(x.n))
              if (candidates.length === 1) found = candidates[0]
            }
            if (found) {
              const ctr = featureCenter(found.f.geometry)
              if (ctr) return nearestNodeToCoord(ctr)
            }
          } catch { }
          return null
        }

        // compute consecutive per day
        for (let i = 0; i < simple.length; i++) {
          const cur = simple[i]
          const prev = simple.slice(0, i).reverse().find(ev => ev.dayKey === cur.dayKey)
          if (!prev) { cur.precomputed = { fromPrevSeconds: null, fromUserPossible: true }; continue }
          const a = resolveLoc(prev.location)
          const b = resolveLoc(cur.location)
          // if same resolved location, prefer user as origin for UX
          if (a && b && a === b) { cur.precomputed = { fromPrevSeconds: null, fromUserPossible: true }; continue }
          if (!a || !b || !g) { cur.precomputed = { fromPrevSeconds: null, fromUserPossible: undefined }; continue }
          try {
            const res = await computeRouteTime({ graph: g, start: a, end: b, excludeStairs: false, coveredOnly: false, mapRef })
            const secs = res?.seconds ?? null
            const gap = (cur.start && prev.end) ? ((cur.start.getTime() - prev.end.getTime()) / 1000) : null
            const fromUserPossible = (secs != null && gap != null) ? ((secs + bufferMin * 60) < gap) : undefined
            cur.precomputed = { fromPrevSeconds: secs, fromUserPossible }
          } catch {
            cur.precomputed = { fromPrevSeconds: null, fromUserPossible: undefined }
          }
        }
        if (!cancelled) setEvents(simple)
      } catch (e) {
        console.warn('ICS load failed', e)
        if (!cancelled) setEvents([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [icalUrl, bufferMin, eventsEnabled])

  return (
    <>
      <LevelSelector levels={levels} level={level} loading={loading} onChange={setLevel} />
      {!showPlanner && <SearchBar data={dataRef.current} onSelect={(id, lvl) => {
        if (!mapRef.current) return
        // save camera before changing
        try { prevCameraRef.current = mapRef.current.getCamera() } catch { }
        if (lvl != null) {
          const n = typeof lvl === 'string' ? parseInt(lvl, 10) : lvl
          if (!Number.isNaN(n) && n !== level) setLevel(n)
        }
        if (mapRef.current && mapRef.current.selectFeatureById) mapRef.current.selectFeatureById(id)
      }} onRouteRequest={(feat) => {
        // open planner with destination prefilled
        setPlannerDest(feat)
        setShowPlanner(true)
      }} onClear={() => {
        if (!mapRef.current) return
        if (mapRef.current && mapRef.current.restoreInitialCamera) mapRef.current.restoreInitialCamera()
        if (mapRef.current && mapRef.current.clearSelection) mapRef.current.clearSelection()
      }} />}
      <MapView ref={mapRef} data={dataRef.current} level={level} />
      {showPlanner && <RoutePlanner
        mapRef={mapRef}
        initialDestination={plannerDest}
        initialStartId={plannerStart?.id}
        initialStartName={plannerStart?.name}
        initialEndId={plannerEnd?.id}
        initialEndName={plannerEnd?.name}
        onClose={() => {
          try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { }
          setShowPlanner(false); setPlannerDest(null); setPlannerStart(null); setPlannerEnd(null); setSelectedEventId(null)
        }} />}
      <SettingsButton onClick={() => setShowSettings(true)} />

      {/* Event selector at bottom center (desktop); CSS positions; keep always mounted if events exist */}
      {eventsEnabled && events && events.length > 0 && (
        <EventSelector
          events={events}
          selectedId={selectedEventId}
          onClear={() => { setSelectedEventId(null); try { mapRef.current?.clearRoute?.() } catch { } }}
          onSelect={async (ev) => {
          // On event click: choose origin based on rule
          const g = graphRef.current
          if (!g) return
          setSelectedEventId(ev.id)
          const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
          const nodeByName = new Map<string, any>()
          for (const n of g.nodes) { const nm = normalize(String(n.name ?? n.id ?? '')); if (nm) nodeByName.set(nm, n) }
          const nearestNodeToCoord = (coord: [number, number]) => {
            let best: { id: string, d: number } | null = null
            const toRad = (v: number) => v * Math.PI / 180
            const hav = (a: [number, number], b: [number, number]) => {
              const R = 6371000
              const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
              const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
              const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
              const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
              return R * c
            }
            for (const n of g.nodes) {
              const d = hav(coord, n.coord as [number, number])
              if (!best || d < best.d) best = { id: String(n.id), d }
            }
            return best ? best.id : null
          }
          const featureCenter = (geom: any): [number, number] | null => {
            if (!geom) return null
            try {
              if (geom.type === 'Point') return geom.coordinates as [number, number]
              const push = (arr: number[][], coords: any) => { for (const c of coords) arr.push(c as number[]) }
              let all: number[][] = []
              if (geom.type === 'Polygon') push(all, geom.coordinates.flat())
              else if (geom.type === 'MultiPolygon') push(all, geom.coordinates.flat(2))
              else if (geom.type === 'LineString') all = geom.coordinates
              else if (geom.type === 'MultiLineString') all = geom.coordinates.flat()
              if (all.length === 0) return null
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
              for (const c of all) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
              return [(minX + maxX) / 2, (minY + maxY) / 2]
            } catch { return null }
          }
          const resolveLoc = (loc: string | null): string | null => {
            if (!loc) return null
            const nrm = normalize(String(loc))
            const n = nodeByName.get(nrm)
            if (n) return String(n.id)
            const data = dataRef.current
            try {
              const feats = (data && data.features) ? data.features : []
              const byName: Array<{ f: any, n: string }> = feats.filter((f: any) => f?.properties?.name).map((f: any) => ({ f, n: normalize(String(f.properties.name)) }))
              let found = byName.find((x: { f: any, n: string }) => x.n === nrm)
              if (!found) {
                const candidates = byName.filter((x: { f: any, n: string }) => x.n.includes(nrm) || nrm.includes(x.n))
                if (candidates.length === 1) found = candidates[0]
              }
              if (found) {
                const ctr = featureCenter(found.f.geometry)
                if (ctr) return nearestNodeToCoord(ctr)
              }
            } catch { }
            return null
          }
          // previous same-day event
          const prev = events.filter(e => e.start && ev.start && e.start < ev.start && e.dayKey === ev.dayKey).slice(-1)[0]
          const startIdPrev = resolveLoc(prev?.location ?? null)
          const endId = resolveLoc(ev.location)
          // If no prev or cannot resolve prev, route from user position
          let usePrev = !!(prev && startIdPrev && endId)
          if (!endId) { alert('Localisation manquante ou introuvable pour cet événement.'); return }
          // if same location, prefer user origin
          if (usePrev && startIdPrev === endId) usePrev = false
          if (usePrev) {
            const res = await computeRouteTime({ graph: g, start: startIdPrev!, end: endId!, excludeStairs: false, coveredOnly: false, mapRef })
            const secs = res?.seconds ?? null
            const gap = (ev.start && prev!.end) ? ((ev.start.getTime() - prev!.end.getTime()) / 1000) : null
            if (secs != null && gap != null && (secs + bufferMin * 60) >= gap) {
              // Show Prev -> Current route (display on map)
              await computeAndDrawRoute({ graph: g, start: startIdPrev!, end: endId!, excludeStairs: false, coveredOnly: false, mapRef, k: 1, draw: true })
              // Open planner with start/end prefilled
              setPlannerStart({ id: startIdPrev!, name: prev?.location || 'Départ' })
              setPlannerEnd({ id: endId!, name: ev.location || 'Arrivée' })
              setShowPlanner(true)
              return
            }
          }
          // Otherwise: compute user -> current
          const geolocate = () => new Promise<{ lng: number, lat: number }>((resolve, reject) => {
            try {
              navigator.geolocation.getCurrentPosition((pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }), (err) => reject(err), { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 })
            } catch (e) { reject(e) }
          })
          try {
            const user = await geolocate()
            // pick nearest graph node to user
            let bestId: string | null = null
            let bestD = Infinity
            const toRad = (v: number) => v * Math.PI / 180
            const hav = (a: [number, number], b: [number, number]) => {
              const R = 6371000
              const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
              const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
              const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
              const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
              return R * c
            }
            for (const n of g.nodes) {
              const d = hav([user.lng, user.lat], n.coord as [number, number])
              if (d < bestD) { bestD = d; bestId = String(n.id) }
            }
            if (bestId) {
              await computeAndDrawRoute({ graph: g, start: bestId, end: endId!, excludeStairs: false, coveredOnly: false, mapRef, k: 1, draw: true })
              setPlannerStart({ id: bestId, name: 'Ma position' })
              setPlannerEnd({ id: endId!, name: ev.location || 'Arrivée' })
              setShowPlanner(true)
              return
            }
          } catch (e) {
            // geolocation failed; fall back to planner with destination prefilled
          }
          setPlannerDest({ name: ev.title ?? ev.location ?? 'Destination', id: endId })
          setPlannerStart(null); setPlannerEnd(null)
          setShowPlanner(true)
        }} />
      )}

      {showSettings && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
          <div style={{ position: 'relative', background: 'white', borderRadius: 10, padding: 16, width: 'min(92vw, 520px)', boxShadow: '0 6px 24px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setShowSettings(false)} aria-label="Fermer" title="Fermer" style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', fontSize: 18 }}>✕</button>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Paramètres</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ConfigSelector embedded />
              <div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Lien iCal</div>
                <input value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} placeholder="https://...calType=ical" style={{ width: '100%', padding: 8, opacity: eventsEnabled ? 1 : 0.6 }} disabled={!eventsEnabled} />
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => { try { localStorage.setItem(ICAL_URL_KEY, icalUrl || '') } catch { } setShowSettings(false) }} style={{ padding: '6px 10px' }}>Sauvegarder</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Marge supplémentaire (minutes) pour départ utilisateur</div>
                <input type="number" min={0} value={bufferMin} onChange={(e) => setBufferMin(Math.max(0, Number(e.target.value)))} style={{ width: 140, padding: 8 }} />
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => { try { localStorage.setItem(TRAVEL_BUFFER_MIN_KEY, String(bufferMin)) } catch { } setShowSettings(false) }} style={{ padding: '6px 10px' }}>Sauvegarder</button>
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={eventsEnabled} onChange={(e) => {
                    const v = e.target.checked
                    setEventsEnabled(v)
                    try { localStorage.setItem(EVENTS_ENABLED_KEY, v ? '1' : '0') } catch { }
                    if (!v) { setEvents([]); setSelectedEventId(null) }
                  }} />
                  Activer les événements iCal (sélecteur + pré‑calculs)
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
