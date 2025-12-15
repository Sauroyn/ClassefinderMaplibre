import { parseGeoJSON } from '../components/route-planner/utils'
import { configsAPI, configNameToSlug, geojsonAPI } from './api'
import { CONFIG_STORAGE_KEY } from './storageKeys'

export type Graph = ReturnType<typeof parseGeoJSON>

export async function loadGraphFromConfigOrFallback(): Promise<Graph | null> {
    const prefix = (import.meta.env && (import.meta.env.BASE_URL || '/'))
    const candidates: string[] = []

    // 1) Try API-first using the selected config slug
    const selectedConfig = (() => {
        try {
            return typeof window !== 'undefined' ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
        } catch {
            return null
        }
    })()

    if (selectedConfig) {
        try {
            const slug = configNameToSlug(selectedConfig)
            const config = await configsAPI.get(slug)
            const graphPath = config?.data?.graphGeojson || config?.data?.graphGeoJSON || config?.data?.graph
            if (graphPath && typeof graphPath === 'string') {
                try {
                    const graphResponse = await geojsonAPI.getByPath(graphPath)
                    if (graphResponse?.data) {
                        return parseGeoJSON(graphResponse.data)
                    }
                } catch (err) {
                    console.warn('[graph] unable to load graph via API path', graphPath, err)
                    // Fallback to public asset if API lookup fails
                    try {
                        const prefix = (import.meta.env && (import.meta.env.BASE_URL || '/'))
                        const url = graphPath.startsWith('/') ? `${prefix}${graphPath.slice(1)}` : `${prefix}${graphPath}`
                        const r = await fetch(url)
                        if (r.ok) {
                            const j = await r.json()
                            const g = parseGeoJSON(j)
                            return g
                        }
                    } catch { }
                }
            }
        } catch (err) {
            console.warn('[graph] unable to resolve graph from API config', selectedConfig, err)
        }
    }

    // 2) Legacy static fallbacks for local/dev usage
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
