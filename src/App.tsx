import { useEffect, useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView'
import LevelSelector from './components/LevelSelector'
import SearchBar from './components/SearchBar'
import RoutePlanner from './components/RoutePlanner'
import ConfigSelector from './components/ConfigSelector'

// import config modules map to read selected config file at runtime (raw)
const __configModules = import.meta.glob('/src/configs/*.json', { as: 'raw' }) as Record<string, () => Promise<string>>
const CONFIG_STORAGE_KEY = 'site_config_file'

export default function App() {
  const [levels, setLevels] = useState<number[]>([])
  const [level, setLevel] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const dataRef = useRef<any | null>(null)
  const mapRef = useRef<any>(null)
  const prevCameraRef = useRef<any>(null)
  const [showPlanner, setShowPlanner] = useState(false)
  const [plannerDest, setPlannerDest] = useState<any | null>(null)

  useEffect(() => {
    ; (async () => {
      // default
      let geoUrl = (import.meta.env && (import.meta.env.BASE_URL || '/')) + 'buildings.geojson'
      try {
        const sel = (typeof window !== 'undefined') ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
        if (sel) {
          const key = Object.keys(__configModules).find(k => k.endsWith('/' + sel) || k.endsWith(sel))
          if (key) {
            try {
              const raw = await __configModules[key]()
              const parsed = JSON.parse(raw)
              if (parsed.geojson && typeof parsed.geojson === 'string') {
                const base = (import.meta.env && (import.meta.env.BASE_URL || '/'))
                geoUrl = base + parsed.geojson.replace(/^\//, '')
              }
            } catch (e) { }
          }
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
      {showPlanner && <RoutePlanner mapRef={mapRef} initialDestination={plannerDest} onClose={() => { try { const m = mapRef && mapRef.current; if (m && m.clearRoute) m.clearRoute() } catch (e) { } setShowPlanner(false); setPlannerDest(null) }} />}
      <ConfigSelector />
    </>
  )
}
