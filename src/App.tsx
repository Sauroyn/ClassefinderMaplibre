import { useEffect, useRef } from 'react'
import maplibre from 'maplibre-gl'
import './App.css'

function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibre.Map | null>(null)
  const selectedId = useRef<number | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibre.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/3b544fc3-420c-4a93-a594-a99b71d941bb/style.json?key=BiyHHi8FTQZ233ADqskZ',
      center: [2.3522, 48.8566],
      zoom: 12,
      maxZoom: 22,
      minZoom: 17, // tu bloques pour rester proche
      maxBounds: [
        [2.3500, 48.8550], // SW
        [2.3550, 48.8580]  // NE
      ]
    })

    mapRef.current = map

    map.on('load', () => {
      // load GeoJSON from public folder
      map.addSource('buildings', {
        type: 'geojson',
        data: '/buildings.geojson'
      })

      // base extrusion layer
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
        }
      })

      // flat fill layer (2D) for high zoom levels (better perf)
      map.addLayer({
        id: 'buildings-fill',
        type: 'fill',
        source: 'buildings',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.9
        },
        layout: { visibility: 'none' }
      })

      // add a highlighted layer for selection (same geometry, color driven by state)
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

      // hover highlight (2D fill overlay to make hover fast and distinct)
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

      // label layer to show name
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
        }
      })

      // click handling sur une forme
      map.on('click', 'buildings-extrusion', (e) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = feat.id as number | string

        // convert string ids to number if possible
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)

        // update selectedId and filter highlight layer
        selectedId.current = numericId
        map.setFilter('buildings-highlight', ['==', ['id'], numericId])
        // clear hover highlight when selected
        map.setFilter('buildings-hover', ['==', ['id'], -1])

        // compute bbox from geometry (simple polygon bbox)
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

        // fallback: fly to clicked point
        const center = (e.lngLat && [e.lngLat.lng, e.lngLat.lat]) as [number, number] | undefined
        if (center) map.flyTo({ center, zoom: 16 })
      })

      // click global : reset sélection/hover si clic hors forme
      map.on('click', (e) => {
        // ignore si le click cible une feature
        const features = map.queryRenderedFeatures(e.point, { layers: ['buildings-extrusion'] })
        if (features.length === 0) {
          selectedId.current = null
          map.setFilter('buildings-highlight', ['==', ['id'], -1])
          map.setFilter('buildings-hover', ['==', ['id'], -1])
        }
      })

      // hover handling: update hover filter and show label on hover
      map.on('mousemove', 'buildings-extrusion', (e) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = feat.id as number | string
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)

        // don't override selected highlight
        if (selectedId.current === numericId) return

        map.setFilter('buildings-hover', ['==', ['id'], numericId])
      })

      map.on('mouseleave', 'buildings-extrusion', () => {
        map.getCanvas().style.cursor = ''
        // clear hover unless selected exists
        if (selectedId.current == null) {
          map.setFilter('buildings-hover', ['==', ['id'], -1])
        } else {
          map.setFilter('buildings-hover', ['==', ['id'], -1])
        }
      })

      map.on('mouseenter', 'buildings-extrusion', () => map.getCanvas().style.cursor = 'pointer')

      // plus besoin de masquer la couche extrusion : la hauteur diminue avec le zoom
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div id="map" ref={mapContainer} />
}

export default App
