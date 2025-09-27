import { useEffect, useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView'
import LevelSelector from './components/LevelSelector'
import SearchBar from './components/SearchBar'
import RoutePlanner from './components/RoutePlanner'
import ConfigSelector from './components/ConfigSelector'
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
