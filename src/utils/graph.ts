import { parseGeoJSON } from '../components/route-planner/utils'

const CONFIG_STORAGE_KEY = 'site_config_file'

export type Graph = ReturnType<typeof parseGeoJSON>

export async function loadGraphFromConfigOrFallback(): Promise<Graph | null> {
    const prefix = (import.meta.env && (import.meta.env.BASE_URL || '/'))
    let candidates: string[] = []
    try {
        const sel = (typeof window !== 'undefined') ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
        if (sel) {
            try {
                const r = await fetch(prefix + 'configs/' + sel)
                if (r.ok) {
                    const parsed = await r.json()
                    if (parsed.graphGeojson && typeof parsed.graphGeojson === 'string') {
                        const url = prefix + String(parsed.graphGeojson).replace(/^\//, '')
                        candidates.push(url)
                    }
                }
            } catch { }
        }
    } catch { }
    candidates.push(prefix + 'testGraph.geojson')
    candidates.push(prefix + 'Paris-graph.geojson')

    for (const url of candidates) {
        try {
            const r = await fetch(url)
            if (!r.ok) continue
            const j = await r.json()
            const g = parseGeoJSON(j)
            return g
        } catch { }
    }
    return null
}
