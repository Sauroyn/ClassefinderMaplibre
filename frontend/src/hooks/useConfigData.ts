import { useEffect, useRef, useState } from 'react'
import { CONFIG_STORAGE_KEY } from '../utils/storageKeys'
import { configsAPI, geojsonAPI, configNameToSlug } from '../utils/api'

export type BuildingFilterSettings = {
    visible: boolean
    levels: 'all' | string[]
    tags: string[]
}

export type BuildingFiltersState = Record<string, BuildingFilterSettings>

export type BuildingMeta = {
    id: string
    label: string
    availableLevels: string[]
    availableTags: string[]
    activeTags: string[]
    defaultVisible: boolean
    defaultLevels?: string[] | null
    defaultTags?: string[] | null
}

const DEFAULT_BUILDING_ID = 'default'

export function useConfigData(buildingFilters?: BuildingFiltersState) {
    const [levels, setLevels] = useState<number[]>([])
    const [level, setLevel] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null)
    const [buildingsMeta, setBuildingsMeta] = useState<BuildingMeta[]>([])
    const [activeConfig, setActiveConfig] = useState<string | null>(null)
    const [rawConfig, setRawConfig] = useState<any | null>(null) // NEW: store raw config for location lock
    const dataRef = useRef<GeoJSON.FeatureCollection | null>(null)
    const rawDataRef = useRef<GeoJSON.FeatureCollection | null>(null)

    const updateLevelsFromData = (fc: GeoJSON.FeatureCollection | null) => {
        if (!fc || !fc.features) {
            setLevels([])
            return
        }
        const numericLevels = fc.features
            .map((f: any) => normalizeLevelNumber(f?.properties?.level))
            .filter((v: number | null): v is number => v !== null)
        const uniq = Array.from(new Set(numericLevels)).sort((a, b) => a - b)
        setLevels(uniq)
        if (uniq.length === 0) return
        setLevel(prev => (uniq.includes(prev) ? prev : uniq[0]))
    }

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            let selectedConfig: string | null = null
            try {
                if (typeof window !== 'undefined') {
                    selectedConfig = localStorage.getItem(CONFIG_STORAGE_KEY) || null
                }
            } catch { }

            let parsedConfig: any = null
            if (selectedConfig) {
                try {
                    // Convert old config names (e.g., "Le Mans univ.json") to slugs
                    const slug = configNameToSlug(selectedConfig);
                    
                    // Use API instead of static files
                    const configData = await configsAPI.get(slug)
                    parsedConfig = configData.data
                    
                    // Update localStorage with the correct slug if it was an old name
                    if (selectedConfig !== slug && typeof window !== 'undefined') {
                        localStorage.setItem(CONFIG_STORAGE_KEY, slug);
                    }
                } catch (err) {
                    console.warn('Failed to load config from API:', err)
                }
            }
            if (!parsedConfig) parsedConfig = {}
            if (!cancelled) {
                setActiveConfig(selectedConfig)
                setRawConfig(parsedConfig) // NEW: store raw config
            }
            try {
                const { combinedData, meta } = await loadBuildingCollections(parsedConfig)
                if (cancelled) return
                rawDataRef.current = combinedData
                setBuildingsMeta(meta)
                const filtered = filterFeatureCollection(combinedData, buildingFilters, meta)
                dataRef.current = filtered
                setData(filtered)
                updateLevelsFromData(filtered)
            } catch (err) {
                if (!cancelled) {
                    console.warn('failed loading geojson', err)
                    rawDataRef.current = null
                    setBuildingsMeta([])
                    setData(null)
                    setLevels([])
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!rawDataRef.current) return
        const filtered = filterFeatureCollection(rawDataRef.current, buildingFilters, buildingsMeta)
        dataRef.current = filtered
        setData(filtered)
        updateLevelsFromData(filtered)
    }, [buildingFilters, buildingsMeta])

    return { levels, level, setLevel, loading, data, dataRef, buildingsMeta, activeConfig, rawConfig }
}

async function loadBuildingCollections(config: any): Promise<{ combinedData: GeoJSON.FeatureCollection, meta: BuildingMeta[] }> {
    const entries = resolveBuildingEntries(config)
    const annotatedCollections: Array<{ entry: typeof entries[number]; data: GeoJSON.FeatureCollection }> = []

    for (const entry of entries) {
        try {
            // Use API to fetch GeoJSON by path
            const geojsonPath = entry.geojson && typeof entry.geojson === 'string'
                ? entry.geojson
                : (entry as any).path && typeof (entry as any).path === 'string'
                    ? (entry as any).path
                    : 'buildings.geojson'
            
            const geojsonData = await geojsonAPI.getByPath(geojsonPath)
            const fc = ensureFeatureCollection(geojsonData.data)
            annotatedCollections.push({ entry, data: annotateFeatures(fc, entry.id, entry.label, entry.fillColor, entry.fillHeight) })
        } catch (err) {
            console.warn(`[useConfigData] unable to load building geojson for ${entry.id}`, err)
        }
    }

    const combinedFeatures: GeoJSON.Feature[] = []
    const meta: BuildingMeta[] = []

    for (const { entry, data } of annotatedCollections) {
        combinedFeatures.push(...data.features)
        const availableLevels = Array.from(new Set(
            data.features
                .map((f: any) => normalizeLevelValue(f?.properties?.level))
                .filter((lvl: string | null): lvl is string => !!lvl)
        )).sort(sortLevelStrings)

        const availableTags = Array.from(new Set(
            data.features
                .flatMap((f: any) => extractPropertyTags(f?.properties))
                .filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, 'fr'))

        meta.push({
            id: entry.id,
            label: entry.label,
            availableLevels,
            availableTags,
            activeTags: entry.activeTags ?? [],
            defaultVisible: entry.defaultVisible !== false,
            defaultLevels: entry.defaultLevels ?? null,
            defaultTags: entry.defaultTags ?? []
        })
    }

    const combinedData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: combinedFeatures
    }

    return { combinedData, meta }
}

function resolveBuildingEntries(config: any): Array<{
    id: string
    label: string
    geojson: string
    defaultVisible?: boolean
    defaultLevels?: string[] | null
    defaultTags?: string[]
    activeTags?: string[]
    fillColor?: string
    fillHeight?: number
}> {
    // Cas 1: buildings array explicite
    if (Array.isArray(config?.buildings) && config.buildings.length > 0) {
        return config.buildings.map((entry: any, index: number) => ({
            id: entry.id || `building-${index}`,
            label: entry.label || entry.name || `Bâtiment ${index + 1}`,
            geojson: entry.geojson || 'buildings.geojson',
            defaultVisible: entry.defaultVisible !== false,
            defaultLevels: Array.isArray(entry.defaultLevels)
                ? entry.defaultLevels.map((lvl: any) => String(lvl))
                : null,
            defaultTags: Array.isArray(entry.defaultTags)
                ? entry.defaultTags.map((tag: any) => String(tag))
                : [],
            activeTags: Array.isArray(entry.activeTags)
                ? entry.activeTags.map((tag: any) => String(tag).toLowerCase().trim())
                : (Array.isArray(config.activeTags) ? config.activeTags.map((t: any) => String(t).toLowerCase().trim()) : []),
            fillColor: entry.fillColor || entry.color || config.fillColor || config.color || undefined,
            fillHeight: typeof entry.fillHeight === 'number' ? entry.fillHeight : (typeof config.fillHeight === 'number' ? config.fillHeight : undefined)
        }))
    }

    // Cas 2: geojson array simple ou objets { path, fillColor, fillHeight }
    if (Array.isArray(config?.geojson) && config.geojson.length > 0) {
        const globalActiveTags = Array.isArray(config.activeTags)
            ? config.activeTags.map((t: any) => String(t).toLowerCase().trim())
            : []
        const globalFillColor = config.fillColor || config.color || undefined
        const globalFillHeight = typeof config.fillHeight === 'number' ? config.fillHeight : undefined

        return config.geojson.map((fileEntry: any, index: number) => {
            const path = typeof fileEntry === 'string'
                ? fileEntry
                : (fileEntry?.path || fileEntry?.geojson || fileEntry?.file || fileEntry?.url || '')

            const fileName = String(path || `building-${index}`).split('/').pop()?.replace('.geojson', '') || `building-${index}`
            return {
                id: fileEntry?.id || `building-${index}`,
                label: fileEntry?.label || fileEntry?.name || fileName.charAt(0).toUpperCase() + fileName.slice(1),
                geojson: String(path),
                defaultVisible: fileEntry?.defaultVisible !== false,
                defaultLevels: Array.isArray(fileEntry?.defaultLevels)
                    ? fileEntry.defaultLevels.map((lvl: any) => String(lvl))
                    : null,
                defaultTags: Array.isArray(fileEntry?.defaultTags)
                    ? fileEntry.defaultTags.map((tag: any) => String(tag))
                    : [],
                activeTags: Array.isArray(fileEntry?.activeTags)
                    ? fileEntry.activeTags.map((tag: any) => String(tag).toLowerCase().trim())
                    : globalActiveTags,
                fillColor: fileEntry?.fillColor || fileEntry?.color || globalFillColor,
                fillHeight: typeof fileEntry?.fillHeight === 'number' ? fileEntry.fillHeight : globalFillHeight
            }
        })
    }

    // Cas 3: geojson string simple (ancien format)
    const geojsonPath = typeof config?.geojson === 'string' && config.geojson.length > 0
        ? config.geojson
        : 'buildings.geojson'

    const fileName = geojsonPath.split('/').pop()?.replace('.geojson', '') || 'building'
    const globalActiveTags = Array.isArray(config?.activeTags)
        ? config.activeTags.map((t: any) => String(t).toLowerCase().trim())
        : []

    return [{
        id: config?.id || DEFAULT_BUILDING_ID,
        label: config?.name || fileName.charAt(0).toUpperCase() + fileName.slice(1),
        geojson: geojsonPath,
        defaultVisible: true,
        defaultLevels: null,
        defaultTags: [],
        activeTags: globalActiveTags,
        fillColor: config.fillColor || config.color || undefined,
        fillHeight: typeof config.fillHeight === 'number' ? config.fillHeight : undefined
    }]
}

function ensureFeatureCollection(payload: any): GeoJSON.FeatureCollection {
    if (payload && payload.type === 'FeatureCollection' && Array.isArray(payload.features)) {
        return payload
    }
    return { type: 'FeatureCollection', features: [] }
}

function annotateFeatures(collection: GeoJSON.FeatureCollection, buildingId: string, buildingLabel: string, fillColor?: string, fillHeight?: number): GeoJSON.FeatureCollection {
    // Essayer de détecter le nom du bâtiment depuis les features elles-mêmes
    let detectedBuildingName: string | null = null
    for (const feature of collection.features) {
        const props = (feature as any).properties
        if (props?.building || props?.buildingName || props?.buildingLabel) {
            detectedBuildingName = String(props.building || props.buildingName || props.buildingLabel).trim()
            if (detectedBuildingName) break
        }
    }

    // Utiliser le nom détecté ou celui fourni
    const finalLabel = detectedBuildingName || buildingLabel

    const features = (collection.features || []).map((feature: any, index: number) => {
        const props = feature.properties || {}

        // Préparer les nouvelles propriétés
        const newProps: any = { ...props }

        // Si pas de propriété level, assigner 0 par défaut (number, pas string!)
        if (props.level === undefined || props.level === null) {
            newProps.level = 0
        } else {
            // S'assurer que level est un number
            const parsed = parseFloat(String(props.level))
            if (Number.isFinite(parsed)) {
                newProps.level = parsed
            } else {
                // Si non parsable, utiliser 0 par défaut
                newProps.level = 0
            }
        }

        // Si pas de propriété name, essayer Nom, nom, NAME, Etiquette, etc.
        if (!props.name && (props.Nom || props.nom || props.NAME || props.Etiquette)) {
            newProps.name = props.Nom || props.nom || props.NAME || props.Etiquette
        }

        // Toujours ajouter les propriétés internes
        newProps.__buildingId = buildingId
        newProps.__buildingLabel = finalLabel

        // Appliquer color et height par fichier si fournis (sans écraser propriétés existantes)
        if (fillColor && !props.color) newProps.color = fillColor
        if (typeof fillHeight === 'number' && !props.height) newProps.height = fillHeight

        // S'assurer que la feature a une géométrie valide
        if (!feature.geometry || !feature.geometry.type) {
            console.warn(`Feature ${index} has no valid geometry, skipping`)
            return null
        }

        return {
            type: 'Feature',
            id: feature.id !== undefined ? feature.id : index,
            geometry: feature.geometry,
            properties: newProps
        } as GeoJSON.Feature
    }).filter((f): f is GeoJSON.Feature => f !== null) // Retirer les features null avec type guard

    return { type: 'FeatureCollection', features }
}

function normalizeLevelNumber(value: any): number | null {
    if (value === null || value === undefined) return null
    if (typeof value === 'number' && Number.isFinite(value)) return value
    const parsed = parseFloat(String(value))
    return Number.isFinite(parsed) ? parsed : null
}

function normalizeLevelValue(value: any): string | null {
    if (value === null || value === undefined) return null
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string' && value.trim().length) return value.trim()
    return null
}

function extractPropertyTags(props: any): string[] {
    if (!props) return []
    const tags: string[] = []

    for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('__')) continue
        if (key === 'level' || key === 'name' || key === 'color' || key === 'height') continue

        if (value === true) {
            tags.push(key)
        } else if (typeof value === 'string' && value.length > 0) {
            tags.push(key)
        }
    }

    return tags.map(tag => tag.toLowerCase().trim()).filter(Boolean)
}

function featureHasActiveTag(props: any, activeTags: string[]): boolean {
    if (!props || activeTags.length === 0) return true

    const normalizedActiveTags = activeTags.map(t => t.toLowerCase().trim())

    for (const tagKey of normalizedActiveTags) {
        const value = props[tagKey]
        if (value === true) return true
        if (typeof value === 'string' && value.length > 0) return true
    }

    return false
}

function sortLevelStrings(a: string, b: string) {
    const numA = Number(a)
    const numB = Number(b)
    if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB
    return a.localeCompare(b, 'fr')
}

export function createDefaultFilterFromMeta(meta?: BuildingMeta): BuildingFilterSettings {
    return {
        visible: meta?.defaultVisible ?? true,
        levels: meta?.defaultLevels && meta.defaultLevels.length ? meta.defaultLevels : 'all',
        tags: meta?.defaultTags ?? []
    }
}

function filterFeatureCollection(
    source: GeoJSON.FeatureCollection | null,
    buildingFilters: BuildingFiltersState | undefined,
    meta: BuildingMeta[]
): GeoJSON.FeatureCollection | null {
    if (!source) return source
    const filters = buildingFilters || {}
    const metaById = new Map(meta.map(m => [m.id, m]))
    const features = (source.features || []).filter((feature: any) => {
        const buildingId = feature?.properties?.__buildingId || DEFAULT_BUILDING_ID
        const metaEntry = metaById.get(buildingId)
        const effectiveFilter = filters[buildingId] || createDefaultFilterFromMeta(metaEntry)

        if (!effectiveFilter.visible) return false

        if (effectiveFilter.levels !== 'all') {
            const levelValue = normalizeLevelValue(feature?.properties?.level)
            if (levelValue && !effectiveFilter.levels.includes(levelValue)) {
                return false
            }
        }

        if (metaEntry && metaEntry.activeTags.length > 0) {
            const hasActiveTag = featureHasActiveTag(feature?.properties, metaEntry.activeTags)
            if (!hasActiveTag) return false
        }

        return true
    })

    return { ...source, features }
}
