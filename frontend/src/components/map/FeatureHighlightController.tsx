import { useEffect } from 'react'
import { shiftColor } from '../../utils/colors'

type Props = {
    mapRef: React.MutableRefObject<any>
    theme: 'light' | 'dark'
}

/**
 * Syncs feature-state highlight/selected colors with the base color of the clicked feature.
 * This keeps highlight tints consistent with the GeoJSON's own color palette.
 */
export function FeatureHighlightController({ mapRef, theme }: Props) {
    useEffect(() => {
        const onClick = (e: any) => {
            const map = mapRef.current
            if (!map) return
            const feat = e?.detail
            const rawId = feat?.id ?? feat?.properties?.id ?? feat?.properties?.fid
            const n = parseInt(String(rawId), 10)
            const id = Number.isFinite(n) ? n : (typeof rawId === 'number' ? rawId : null)
            if (id == null) return

            const resolver = (map as any).__resolveFeatureColor as undefined | ((id: number) => string | undefined)
            const base = resolver ? resolver(id) : undefined
            const highlightColor = base ? shiftColor(base, -0.15) : undefined
            const selectedColor = base ? shiftColor(base, 0.15) : undefined

            try {
                map.setFeatureState({ source: 'buildings', id }, {
                    highlight: true,
                    highlightColor,
                    selected: true,
                    selectedColor
                })
            } catch { /* silent */ }
        }
        window.addEventListener('map:feature-click', onClick as any)
        return () => window.removeEventListener('map:feature-click', onClick as any)
    }, [mapRef, theme])

    return null
}
