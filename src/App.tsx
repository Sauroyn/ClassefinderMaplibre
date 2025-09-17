import { useEffect, useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView'
import LevelSelector from './components/LevelSelector'

export default function App() {
  const [levels, setLevels] = useState<number[]>([])
  const [level, setLevel] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const dataRef = useRef<any | null>(null)

  useEffect(() => {
    fetch('/buildings.geojson').then(r => r.json()).then(d => { dataRef.current = d; const found = Array.from(new Set((d.features || []).map((f: any) => f.properties?.level))).filter(Boolean) as number[]; found.sort((a, b) => a - b); setLevels(found); setLoading(false); if (found.length) setLevel(found[0]) })
  }, [])

  return (
    <>
      <LevelSelector level={level} levels={levels} loading={loading} onChange={setLevel} />
      {dataRef.current && <MapView data={dataRef.current} level={level} />}
    </>
  )
}
