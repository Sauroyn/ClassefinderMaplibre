import { useEffect, useRef, useState } from 'react'
import maplibre from 'maplibre-gl'
import './App.css'

function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibre.Map | null>(null)
  const selectedId = useRef<number | null>(null)
  const [level, setLevel] = useState<number>(0)
  const [levels, setLevels] = useState<number[]>([])
  const [loadingLevels, setLoadingLevels] = useState<boolean>(true)
  const [mapLoaded, setMapLoaded] = useState<boolean>(false)

  useEffect(() => {
    // Lecture dynamique des levels du GeoJSON
    fetch('/buildings.geojson')
      .then(res => res.json())
      .then(data => {
        const foundLevels = Array.from(new Set(
          (data.features || [])
            .map((f: any) => f.properties?.level)
            .filter((l: any): l is number => typeof l === 'number' && !isNaN(l))
        )) as number[]
        foundLevels.sort((a, b) => a - b)
        setLevels(foundLevels)
        setLoadingLevels(false)
        if (foundLevels.length > 0) setLevel(foundLevels[0])
      })
  }, [])

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibre.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/3b544fc3-420c-4a93-a594-a99b71d941bb/style.json?key=BiyHHi8FTQZ233ADqskZ',
      center: [2.3522, 48.8566],
      zoom: 12,
      maxZoom: 22,
      minZoom: 5,
    })

    mapRef.current = map

    function updateLevelFilter(lvl: number) {
      const filter = ['==', ['get', 'level'], lvl]
      try {
        map.setFilter('buildings-extrusion', filter as any)
        map.setFilter('buildings-fill', filter as any)
        map.setFilter('buildings-label', filter as any)
        map.setFilter('buildings-hover', filter as any)
        if (selectedId.current != null) {
          map.setFilter('buildings-highlight', ['all', ['==', ['get', 'level'], lvl], ['==', ['id'], selectedId.current]] as any)
        } else {
          map.setFilter('buildings-highlight', ['==', ['id'], -1] as any)
        }
      } catch (e) { }
    }

    map.on('load', () => {
      setMapLoaded(true)
      map.addSource('buildings', {
        type: 'geojson',
        data: '/buildings.geojson'
      })

      map.addLayer({
        id: 'buildings-extrusion',
        type: 'fill-extrusion',
        source: 'buildings',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15.9, ['get', 'height'],
            16, 0
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9
        },
        filter: ['==', ['get', 'level'], level]
      })

      map.addLayer({
        id: 'buildings-fill',
        type: 'fill',
        source: 'buildings',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.9
        },
        layout: { visibility: 'none' },
        filter: ['==', ['get', 'level'], level]
      })

      map.addLayer({
        id: 'buildings-highlight',
        type: 'fill-extrusion',
        source: 'buildings',
        paint: {
          'fill-extrusion-color': '#ffcc00',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15.9, ['get', 'height'],
            16, 0
          ],
          'fill-extrusion-opacity': 0.95
        },
        filter: ['==', ['id'], -1]
      })

      map.addLayer({
        id: 'buildings-hover',
        type: 'fill',
        source: 'buildings',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.25
        },
        filter: ['==', ['id'], -1]
      })

      map.addLayer({
        id: 'buildings-label',
        type: 'symbol',
        source: 'buildings',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 14,
          'text-offset': [0, 0.6],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#ffffff'
        },
        filter: ['==', ['get', 'level'], level]
      })

      map.on('click', 'buildings-extrusion', (e) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = feat.id as number | string
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)
        selectedId.current = numericId
        map.setFilter('buildings-highlight', ['all', ['==', ['get', 'level'], level], ['==', ['id'], numericId]] as any)
        map.setFilter('buildings-hover', ['==', ['id'], -1] as any)
        const geom = (feat as any).geometry
        if (geom && geom.type === 'Polygon') {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          const coords = geom.coordinates[0]
          for (const c of coords) {
            const x = c[0], y = c[1]
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
          }
          if (isFinite(minX)) {
            map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, duration: 800 })
            return
          }
        }
        const center = (e.lngLat && [e.lngLat.lng, e.lngLat.lat]) as [number, number] | undefined
        if (center) map.flyTo({ center, zoom: 16 })
      })

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['buildings-extrusion'] })
        if (features.length === 0) {
          selectedId.current = null
          map.setFilter('buildings-highlight', ['==', ['id'], -1] as any)
          map.setFilter('buildings-hover', ['==', ['id'], -1] as any)
        }
      })

      map.on('mousemove', 'buildings-extrusion', (e) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = feat.id as number | string
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)
        if (selectedId.current === numericId) return
        map.setFilter('buildings-hover', ['all', ['==', ['get', 'level'], level], ['==', ['id'], numericId]] as any)
      })

      map.on('mouseleave', 'buildings-extrusion', () => {
        map.getCanvas().style.cursor = ''
        if (selectedId.current == null) {
          map.setFilter('buildings-hover', ['==', ['id'], -1] as any)
        } else {
          map.setFilter('buildings-hover', ['==', ['id'], -1] as any)
        }
      })

      map.on('mouseenter', 'buildings-extrusion', () => map.getCanvas().style.cursor = 'pointer')
      updateLevelFilter(level)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Met à jour le filtre sur changement de niveau ou quand le niveau initial est défini et la map chargée
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const filter = ['==', ['get', 'level'], level]
    try {
      map.setFilter('buildings-extrusion', filter as any)
      map.setFilter('buildings-fill', filter as any)
      map.setFilter('buildings-label', filter as any)
      map.setFilter('buildings-hover', filter as any)
      if (selectedId.current != null) {
        map.setFilter('buildings-highlight', ['all', ['==', ['get', 'level'], level], ['==', ['id'], selectedId.current]] as any)
      } else {
        map.setFilter('buildings-highlight', ['==', ['id'], -1] as any)
      }
    } catch (e) { }
  }, [level, mapLoaded])

  return (
    <>
      <div style={{ position: 'absolute', zIndex: 10, left: 10, top: 10, background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px', color: 'white' }}>
        <label htmlFor="level-select">Niveau : </label>
        <select id="level-select" value={level} onChange={e => setLevel(Number(e.target.value))} disabled={loadingLevels || levels.length === 0}>
          {loadingLevels ? (
            <option>Chargement...</option>
          ) : levels.length === 0 ? (
            <option>Aucun niveau</option>
          ) : (
            levels.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))
          )}
        </select>
      </div>
      <div id="map" ref={mapContainer} />
    </>
  )
}

export default App
