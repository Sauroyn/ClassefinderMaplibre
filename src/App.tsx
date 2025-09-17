import { useEffect, useRef, useState } from 'react'
import maplibre from 'maplibre-gl'
import './App.css'

function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibre.Map | null>(null)
  const selectedId = useRef<number | null>(null)
  const hoveredId = useRef<number | null>(null)
  const previousSelectedId = useRef<number | null>(null)
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
      style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=BiyHHi8FTQZ233ADqskZ',
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
        if (selectedId.current != null) {
          // keep selection state applied via feature-state, nothing to set on filters
        }
      } catch (e) { }
    }

    map.on('load', () => {
      setMapLoaded(true)
      map.addSource('buildings', {
        type: 'geojson',
        data: '/buildings.geojson'
      })

      // Layer: extrusion (3D)
      map.addLayer({
        id: 'buildings-extrusion',
        type: 'fill-extrusion',
        source: 'buildings',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], '#ffcc00',
            ['boolean', ['feature-state', 'selected'], false], '#ffcc00',
            ['get', 'color']
          ],
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'], 15.9, ['get', 'height'], 16, 0
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 15.9, 0.9, 16, 0]
        },
        filter: ['==', ['get', 'level'], level]
      })

      // Layer: 2D fill
      map.addLayer({
        id: 'buildings-fill',
        type: 'fill',
        source: 'buildings',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], '#ffcc00',
            ['boolean', ['feature-state', 'selected'], false], '#ffcc00',
            ['get', 'color']
          ],
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 15.9, 0, 16, 0.9]
        },
        layout: { visibility: 'visible' },
        filter: ['==', ['get', 'level'], level]
      })

      // Labels
      map.addLayer({
        id: 'buildings-label',
        type: 'symbol',
        source: 'buildings',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 14,
          'text-offset': [0, 0.6],
          'text-anchor': 'center',
          'symbol-placement': 'point',
          'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#ffffff'
        },
        filter: ['==', ['get', 'level'], level],
        minzoom: 12,
        maxzoom: 18
      })

      function setHoverFeature(numericId: number | null) {
        if (hoveredId.current === numericId) return
        try {
          if (hoveredId.current != null) {
            map.setFeatureState({ source: 'buildings', id: hoveredId.current }, { hover: false })
          }
        } catch (e) { }
        if (numericId != null) {
          try {
            map.setFeatureState({ source: 'buildings', id: numericId }, { hover: true })
          } catch (e) { }
        }
        hoveredId.current = numericId
      }

      function setSelectedFeature(numericId: number | null) {
        try {
          if (previousSelectedId.current != null) {
            map.setFeatureState({ source: 'buildings', id: previousSelectedId.current }, { selected: false })
          }
        } catch (e) { }
        if (numericId != null) {
          try {
            map.setFeatureState({ source: 'buildings', id: numericId }, { selected: true })
          } catch (e) { }
        }
        previousSelectedId.current = numericId
      }

      function handleHover(e: any) {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = feat.id as number | string
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)
        setHoverFeature(numericId)
      }

      function handleClick(e: any) {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = feat.id as number | string
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)
        selectedId.current = numericId
        setSelectedFeature(numericId)
        setHoverFeature(null)
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
      }

      map.on('mousemove', 'buildings-extrusion', handleHover)
      map.on('mousemove', 'buildings-fill', handleHover)
      map.on('click', 'buildings-extrusion', handleClick)
      map.on('click', 'buildings-fill', handleClick)

      // Clear selection when clicking outside any building feature
      map.on('click', (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['buildings-fill', 'buildings-extrusion'] })
        if (!features || features.length === 0) {
          // clicked outside: clear selection
          setSelectedFeature(null)
          selectedId.current = null
        }
      })

      map.on('mouseleave', 'buildings-extrusion', () => {
        map.getCanvas().style.cursor = ''
        setHoverFeature(null)
      })
      map.on('mouseleave', 'buildings-fill', () => {
        map.getCanvas().style.cursor = ''
        setHoverFeature(null)
      })
      map.on('mouseenter', 'buildings-extrusion', () => map.getCanvas().style.cursor = 'pointer')
      map.on('mouseenter', 'buildings-fill', () => map.getCanvas().style.cursor = 'pointer')

      // We use zoom-based opacity interpolation on the layers to avoid flicker when switching 3D/2D
      updateLevelFilter(level)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const filter = ['==', ['get', 'level'], level]
    try {
      map.setFilter('buildings-extrusion', filter as any)
      map.setFilter('buildings-fill', filter as any)
      map.setFilter('buildings-label', filter as any)
      // selection/highlight handled via feature-state; nothing else to set here
    } catch (e) { }
    // clear previous selection/hover states when changing level
    try {
      if (previousSelectedId.current != null) {
        map.setFeatureState({ source: 'buildings', id: previousSelectedId.current }, { selected: false })
        previousSelectedId.current = null
      }
      if (hoveredId.current != null) {
        map.setFeatureState({ source: 'buildings', id: hoveredId.current }, { hover: false })
        hoveredId.current = null
      }
      selectedId.current = null
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
