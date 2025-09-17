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
      zoom: 12
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
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9
        }
      })

      // add a highlighted layer for selection (same geometry, color driven by state)
      map.addLayer({
        id: 'buildings-highlight',
        type: 'fill-extrusion',
        source: 'buildings',
        paint: {
          'fill-extrusion-color': '#ffcc00',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.95
        },
        filter: ['==', ['id'], -1]
      })

      // click handling
      map.on('click', 'buildings-extrusion', (e) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = feat.id as number | string

        // convert string ids to number if possible
        const numericId = typeof id === 'number' ? id : parseInt(String(id), 10)

        // update selectedId and filter highlight layer
        selectedId.current = numericId
        map.setFilter('buildings-highlight', ['==', ['id'], numericId])

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

      // change cursor on hover
      map.on('mouseenter', 'buildings-extrusion', () => map.getCanvas().style.cursor = 'pointer')
      map.on('mouseleave', 'buildings-extrusion', () => map.getCanvas().style.cursor = '')
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div id="map" ref={mapContainer} />
}

export default App
