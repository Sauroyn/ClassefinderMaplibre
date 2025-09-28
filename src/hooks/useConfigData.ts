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
                const found = Array.from(new Set((d.features || []).map((f: any) => f.properties?.level))).filter(Boolean) as number[]
                found.sort((a, b) => a - b)
                setLevels(found)
                setLoading(false)
                if (found.length) setLevel(found[0])
            } catch (e) {
                console.warn('failed loading geojson', e)
                setLoading(false)
            }
        })()
    }, [])

    return { levels, level, setLevel, loading, dataRef }
}
