import { useState, useEffect } from 'react'
import { shortestPath } from '../map/shortestPath'

type Graph = { nodes: any[], edges: any[] }

function parseGeoJSON(geo: any): Graph {
    const nodes: any[] = []
    const edges: any[] = []
    if (!geo || !geo.features) return { nodes, edges }
    for (const f of geo.features) {
        const t = f.properties && f.properties.type
        if (t === 'node') nodes.push({ id: String(f.properties.id), coord: f.geometry.coordinates })
        else if (t === 'edge') edges.push({ id: String(f.properties.id), from: String(f.properties.from), to: String(f.properties.to), weight: f.properties.weight ?? 1, tags: f.properties.tags || [] })
    }
    return { nodes, edges }
}

export default function RoutePlanner({ mapRef }: { mapRef: any }) {
    const [graph, setGraph] = useState<Graph | null>(null)
    const [start, setStart] = useState<string>('A')
    const [end, setEnd] = useState<string>('D')
    const [excludeStairs, setExcludeStairs] = useState(false)
    const [path, setPath] = useState<string[] | null>(null)

    useEffect(() => {
        console.log('[RoutePlanner] loading testGraph.json')
        fetch('/src/map/testGraph.json').then(r => r.json()).then(j => {
            const g = parseGeoJSON(j)
            console.log('[RoutePlanner] parsed graph', g)
            setGraph(g)
        }).catch(err => { console.error('[RoutePlanner] failed to load graph', err); setGraph(null) })
    }, [])

    function getRawMap() {
        if (!mapRef) return null
        const cur = mapRef.current
        if (!cur) return null
        if ((cur as any).getMap) return (cur as any).getMap()
        if ((cur as any).map) return (cur as any).map
        return cur
    }

    function compute() {
        console.log('[RoutePlanner] compute clicked', { start, end, excludeStairs })
        if (!graph) { console.warn('[RoutePlanner] no graph loaded'); return }
        const exclude = excludeStairs ? ['stairs'] : []
        try {
            const p = shortestPath({ nodes: graph.nodes, edges: graph.edges }, String(start), String(end), exclude)
            console.log('[RoutePlanner] shortestPath result', p)
            setPath(p as string[] | null)
            if (p) {
                const coords = (p as string[]).map((id) => {
                    const n = graph.nodes.find(x => x.id === String(id))
                    return n ? n.coord : null
                }).filter(Boolean)
                const geo = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }] }
                const map = getRawMap()
                if (!map) { console.warn('[RoutePlanner] map instance not found'); return }
                try {
                    console.log('[RoutePlanner] map object', map)
                    if (map.getSource && map.getSource('route-planner')) {
                        console.log('[RoutePlanner] updating existing source')
                        map.getSource('route-planner').setData(geo)
                        try {
                            if (map.setPaintProperty) {
                                map.setPaintProperty('route-planner-line', 'line-color', '#ff0000')
                                map.setPaintProperty('route-planner-line', 'line-width', 18)
                            }
                            if (map.setLayoutProperty) {
                                map.setLayoutProperty('route-planner-line', 'line-cap', 'round')
                                map.setLayoutProperty('route-planner-line', 'line-join', 'round')
                            }
                        } catch (e) { /* non-fatal */ }
                    } else {
                        console.log('[RoutePlanner] adding source and layer')
                        if (map.addSource) map.addSource('route-planner', { type: 'geojson', data: geo })
                        if (map.addLayer) map.addLayer({ id: 'route-planner-line', type: 'line', source: 'route-planner', paint: { 'line-color': '#ff0000', 'line-width': 18 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
                    }
                    // fit to route bounds
                    try {
                        const coordsArr = coords as any[]
                        if (coordsArr.length) {
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                            for (const c of coordsArr) { if (c[0] < minX) minX = c[0]; if (c[1] < minY) minY = c[1]; if (c[0] > maxX) maxX = c[0]; if (c[1] > maxY) maxY = c[1] }
                            if (isFinite(minX)) map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 40, duration: 400 })
                        }
                    } catch (e) { console.warn('[RoutePlanner] fitBounds failed', e) }
                } catch (err) { console.error('[RoutePlanner] error drawing route', err) }
            }
        } catch (err) { console.error('[RoutePlanner] compute failed', err) }
    }

    function clearMap() {
        const map = getRawMap()
        setPath(null)
        if (!map) return
        try {
            if (map.getSource && map.getSource('route-planner')) {
                if (map.removeLayer) map.removeLayer('route-planner-line')
                if (map.removeSource) map.removeSource('route-planner')
                console.log('[RoutePlanner] cleared route from map')
            }
        } catch (err) { console.warn('[RoutePlanner] error clearing map', err) }
    }

    return (
        <div style={{ position: 'absolute', top: 80, left: 10, background: 'white', padding: 8, borderRadius: 4, zIndex: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Route Planner (local)</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <div>
                    <div style={{ fontSize: 12 }}>Start</div>
                    <input value={start} onChange={(e) => setStart(e.target.value)} style={{ width: 80 }} />
                </div>
                <div>
                    <div style={{ fontSize: 12 }}>End</div>
                    <input value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: 80 }} />
                </div>
            </div>
            <label style={{ display: 'block', marginBottom: 6 }}>
                <input type="checkbox" checked={excludeStairs} onChange={e => setExcludeStairs(e.target.checked)} /> Exclude stairs
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={compute}>Compute</button>
                <button onClick={clearMap}>Clear</button>
            </div>
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12 }}>Result</div>
                <div style={{ fontSize: 13 }}>{path ? path.join(' → ') : '—'}</div>
            </div>
        </div>
    )
}
