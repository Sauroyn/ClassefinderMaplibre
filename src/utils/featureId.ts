// Utilities to compute a stable, normalized feature id identical to MapView's logic
// and to find features by that normalized id within a FeatureCollection.

export function normalizedFeatureId(_f: any, idx: number): number {
    // ALWAYS use the index to guarantee uniqueness
    // Using f.id or properties.id can cause collisions when multiple features share the same id
    return idx
}

export function coerceLevel(lvl: any): number | string | undefined {
    if (lvl == null) return undefined
    if (typeof lvl === 'number') return lvl
    const n = parseInt(String(lvl), 10)
    return Number.isFinite(n) ? n : lvl
}

export function findByNormalizedId(fc: GeoJSON.FeatureCollection | null | undefined, id: number | string): any | null {
    if (!fc || !Array.isArray((fc as any).features)) return null
    const want = (typeof id === 'number') ? id : (parseInt(String(id), 10))
    for (let i = 0; i < (fc as any).features.length; i++) {
        const f = (fc as any).features[i]
        const nid = normalizedFeatureId(f, i)
        if (nid === (Number.isFinite(want) ? want : id)) return f
    }
    return null
}
