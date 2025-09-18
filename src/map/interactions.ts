import maplibre from 'maplibre-gl'

export function addInteractions(map: maplibre.Map, refs: any) {
    function setHover(id: number | null) {
        if (refs.hovered === id) return
        if (refs.hovered != null) try { map.setFeatureState({ source: 'buildings', id: refs.hovered }, { hover: false }) } catch (e) { }
        if (id != null) try { map.setFeatureState({ source: 'buildings', id }, { hover: true }) } catch (e) { }
        refs.hovered = id
    }
    function setSelected(id: number | null) {
        if (refs.selectedPrev != null) try { map.setFeatureState({ source: 'buildings', id: refs.selectedPrev }, { selected: false }) } catch (e) { }
        if (id != null) try { map.setFeatureState({ source: 'buildings', id }, { selected: true }) } catch (e) { }
        refs.selectedPrev = id
    }

    const hoverHandler = (e: any) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = typeof feat.id === 'number' ? feat.id : parseInt(String(feat.id), 10)
        setHover(id)
    }
    const clickHandler = (e: any) => {
        const feat = e.features && e.features[0]
        if (!feat) return
        const id = typeof feat.id === 'number' ? feat.id : parseInt(String(feat.id), 10)
        refs.selected = id
        setSelected(id)
        setHover(null)
        const geom = feat.geometry
        if (geom) {
            if (geom.type === 'Polygon') {
                const ring = geom.coordinates[0]
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                for (const c of ring) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                if (isFinite(minX)) { map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, duration: 800 }); }
            } else if (geom.type === 'MultiPolygon') {
                // choose largest polygon by area
                let best: { area: number, bounds: [number, number, number, number] } | null = null
                for (const poly of geom.coordinates) {
                    const ring = poly[0]
                    let a = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    for (let i = 0; i < ring.length - 1; i++) { const x0 = ring[i][0], y0 = ring[i][1], x1 = ring[i + 1][0], y1 = ring[i + 1][1]; a += (x0 * y1 - x1 * y0); if (x0 < minX) minX = x0; if (y0 < minY) minY = y0; if (x0 > maxX) maxX = x0; if (y0 > maxY) maxY = y0 }
                    a = Math.abs(a) / 2
                    if (!best || a > best.area) best = { area: a, bounds: [minX, minY, maxX, maxY] }
                }
                if (best) { map.fitBounds([[best.bounds[0], best.bounds[1]], [best.bounds[2], best.bounds[3]]], { padding: 60, duration: 800 }); }
            }
        }
        const center = (e.lngLat && [e.lngLat.lng, e.lngLat.lat]) as [number, number] | undefined
        if (center) map.flyTo({ center, zoom: 16 })
        // dispatch a global event so UI components can react to feature clicks
        try { window.dispatchEvent(new CustomEvent('map:feature-click', { detail: feat })) } catch (e) { }
    }

    map.on('mousemove', 'buildings-extrusion', hoverHandler)
    map.on('mousemove', 'buildings-fill', hoverHandler)
    map.on('click', 'buildings-extrusion', clickHandler)
    map.on('click', 'buildings-fill', clickHandler)
    map.on('click', (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['buildings-fill', 'buildings-extrusion'] })
        if (!features || features.length === 0) { setSelected(null); refs.selected = null }
    })
    map.on('mouseleave', 'buildings-extrusion', () => setHover(null))
    map.on('mouseleave', 'buildings-fill', () => setHover(null))
    map.on('mouseenter', 'buildings-extrusion', () => map.getCanvas().style.cursor = 'pointer')
    map.on('mouseenter', 'buildings-fill', () => map.getCanvas().style.cursor = 'pointer')
}
