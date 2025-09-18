import { useEffect, useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView'
import LevelSelector from './components/LevelSelector'
import SearchBar from './components/SearchBar'
import RoutePlanner from './components/RoutePlanner'

export default function App() {
  const [levels, setLevels] = useState<number[]>([])
  const [level, setLevel] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const dataRef = useRef<any | null>(null)
  const mapRef = useRef<any>(null)
  const prevCameraRef = useRef<any>(null)
  const [showPlanner, setShowPlanner] = useState(false)

  useEffect(() => {
    fetch('/buildings.geojson').then(r => r.json()).then(d => { dataRef.current = d; const found = Array.from(new Set((d.features || []).map((f: any) => f.properties?.level))).filter(Boolean) as number[]; found.sort((a, b) => a - b); setLevels(found); setLoading(false); if (found.length) setLevel(found[0]) })
  }, [])

  return (
    <>
      <LevelSelector levels={levels} level={level} loading={loading} onChange={setLevel} />
      <SearchBar data={dataRef.current} onSelect={(id, lvl) => {
        if (!mapRef.current) return
        // save camera before changing
        try { prevCameraRef.current = mapRef.current.getCamera() } catch { }
        if (lvl != null) {
          const n = typeof lvl === 'string' ? parseInt(lvl, 10) : lvl
          if (!Number.isNaN(n) && n !== level) setLevel(n)
        }
        if (mapRef.current && mapRef.current.selectFeatureById) mapRef.current.selectFeatureById(id)
      }} onClear={() => {
        if (!mapRef.current) return
        if (mapRef.current && mapRef.current.restoreInitialCamera) mapRef.current.restoreInitialCamera()
        if (mapRef.current && mapRef.current.clearSelection) mapRef.current.clearSelection()
      }} />
      <MapView ref={mapRef} data={dataRef.current} level={level} />
      {showPlanner && <RoutePlanner mapRef={mapRef} />}
      <button style={{ position: 'absolute', top: 10, right: 10, zIndex: 20 }} onClick={() => setShowPlanner(s => !s)}>{showPlanner ? 'Close Planner' : 'Open Planner'}</button>
    </>
  )
}
