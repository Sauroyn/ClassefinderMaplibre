import { useEffect, useRef, useState } from 'react'
import { CONFIG_STORAGE_KEY } from '../utils/storageKeys'

export function useConfigData() {
    const [levels, setLevels] = useState<number[]>([])
    const [level, setLevel] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const dataRef = useRef<any | null>(null)

    useEffect(() => {
        ; (async () => {
            let geoUrl = (import.meta.env && (import.meta.env.BASE_URL || '/')) + 'buildings.geojson'
            try {
                const sel = (typeof window !== 'undefined') ? (localStorage.getItem(CONFIG_STORAGE_KEY) || null) : null
                if (sel) {
                    try {
                        const base = (import.meta.env && (import.meta.env.BASE_URL || '/'))
                        const r = await fetch(base + 'configs/' + sel)
                        if (r.ok) {
                            const parsed = await r.json()
                            if (parsed.geojson && typeof parsed.geojson === 'string') {
                                geoUrl = base + String(parsed.geojson).replace(/^\//, '')
                            }
                        }
                    } catch { }
                }
            } catch { }
            try {
                const r = await fetch(geoUrl)
                const d = await r.json()
                dataRef.current = d
                // Collect levels, coercing strings to numbers; keep 0; drop non-finite
                const rawLevels = (d.features || []).map((f: any) => (f && f.properties ? f.properties.level : undefined))
                const numericLevels = rawLevels
                    .map((v: any) => {
                        if (v === null || v === undefined) return null
                        const n = (typeof v === 'string') ? parseInt(v, 10) : Number(v)
                        return Number.isFinite(n) ? n : null
                    })
                    .filter((v: number | null): v is number => v !== null)
                const uniq: number[] = Array.from(new Set<number>(numericLevels))
                uniq.sort((a: number, b: number) => a - b)
                setLevels(uniq)
                setLoading(false)
                if (uniq.length) setLevel(uniq[0] as number)
            } catch (e) {
                console.warn('failed loading geojson', e)
                setLoading(false)
            }
        })()
    }, [])

    return { levels, level, setLevel, loading, dataRef }
}
