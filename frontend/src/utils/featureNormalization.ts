/**
 * Feature normalization utilities
 * Ensures consistent feature ID, level coercion, and theme-aware color derivation
 */

import { deriveDarkColor } from './colors'

/**
 * Normalize a single feature:
 * - Ensures numeric level property
 * - Sets a stable numeric ID
 * - Derives dark mode color if needed
 */
export function normalizeFeature(f: any, idx: number): any {
    try {
        const p = { ...(f.properties || {}) }

        // Coerce level: accept string or number
        if (p.level != null) {
            const n = typeof p.level === 'string' ? parseInt(p.level, 10) : p.level
            p.level = Number.isFinite(n) ? n : p.level
        }

        // Set a stable id if missing
        const fid = (f.id != null ? f.id : (p.fid != null ? p.fid : (p.id != null ? p.id : undefined)))
        let newId: number
        if (fid != null) {
            if (typeof fid === 'number' && Number.isFinite(fid)) {
                newId = fid
            } else {
                const n = parseInt(String(fid), 10)
                newId = Number.isFinite(n) ? n : idx
            }
        } else {
            newId = idx
        }

        return { ...f, id: newId, properties: p }
    } catch {
        return { ...f, id: (f.id ?? idx) }
    }
}

/**
 * Normalize a FeatureCollection and optionally add dark mode colors
 * 
 * @param data - GeoJSON FeatureCollection
 * @param addDarkColors - Whether to derive dark colors for theme switching
 * @returns Normalized FeatureCollection
 */
export function normalizeFeatureCollection(data: any, addDarkColors: boolean = false): any {
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
        return data
    }

    const normalized = {
        ...data,
        features: data.features.map((f: any, idx: number) => normalizeFeature(f, idx))
    }

    if (!addDarkColors) {
        return normalized
    }

    // Add dark mode colors
    return {
        ...normalized,
        features: normalized.features.map((f: any) => {
            try {
                const p = { ...(f.properties || {}) }
                if (p.color && typeof p.color === 'string') {
                    p.darkColor = deriveDarkColor(p.color)
                }
                return { ...f, properties: p }
            } catch {
                return f
            }
        })
    }
}
