import { useEffect, useRef } from 'react'
import maplibre from 'maplibre-gl'
import { addBuildingsSource, addCentroidsSource } from '../map/sources'
import { addFillLayers, addNameLayer } from '../map/layers'
import { generateCentroids } from '../map/generateCentroids'
import { addInteractions } from '../map/interactions'

type Props = { data: any, level: number }

export default function MapView({ data, level }: Props) {
    const container = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibre.Map | null>(null)
    useEffect(() => {
        if (!container.current) return
        const map = new maplibre.Map({ container: container.current, style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=BiyHHi8FTQZ233ADqskZ', center: [2.3522, 48.8566], zoom: 12 })
        mapRef.current = map
        map.on('load', () => {
            addBuildingsSource(map, data)
            addFillLayers(map, level)
            const centroids = generateCentroids(data)
            addCentroidsSource(map, centroids)
            addNameLayer(map, level)
            addInteractions(map, { hovered: null, selected: null, selectedPrev: null })
        })
        return () => { map.remove(); mapRef.current = null }
    }, [])
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        const filter = ['==', ['get', 'level'], level]
        try {
            map.setFilter('buildings-extrusion', filter as any)
            map.setFilter('buildings-fill', filter as any)
            map.setFilter('buildings-name', filter as any)
        } catch (e) { }
    }, [level])
    return <div id="map" ref={container} style={{ height: '100vh' }} />
}
