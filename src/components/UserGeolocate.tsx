import React, { useEffect, useRef, useState } from 'react'
import maplibre from 'maplibre-gl'
import { LocationArrow, Sun, Moon } from '@gravity-ui/icons'

type Props = { map?: maplibre.Map | null, theme?: 'light' | 'dark', onToggleTheme?: () => void }

const UserGeolocate: React.FC<Props> = ({ map, theme = 'light', onToggleTheme }) => {
    const controlRef = useRef<maplibre.GeolocateControl | null>(null)
    const [top, setTop] = useState<number | null>(null)
    const [visible, setVisible] = useState<boolean>(true)

    // install control (hidden)
    useEffect(() => {
        if (!map) return
        if (!controlRef.current) {
            controlRef.current = new maplibre.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true })
            try { map.addControl(controlRef.current!, 'top-right') } catch (e) { }
            // hide the default control UI
            try {
                const container = (map as any).getContainer ? (map as any).getContainer() : null
                const el = container ? container.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-geolocate') as HTMLElement | null : null
                if (el) el.style.display = 'none'
            } catch (e) { }
        }
        return () => {
            if (controlRef.current) {
                try { map.removeControl(controlRef.current) } catch (e) { }
                controlRef.current = null
            }
        }
    }, [map])

    // position the custom button below the level selector (consistent gap)
    useEffect(() => {
        const compute = () => {
            try {
                const sel = document.querySelector('.level-selector') as HTMLElement | null
                const GAP = 8
                if (sel) {
                    const cs = window.getComputedStyle(sel)
                    const pos = cs.position
                    const rect = sel.getBoundingClientRect()
                    const vv = (window as any).visualViewport
                    const vvOffsetTop = vv && typeof vv.offsetTop === 'number' ? vv.offsetTop : 0
                    let baseTop: number
                    if (pos === 'fixed') {
                        // prefer computed top if available, else rect.top
                        const topCss = parseFloat(cs.top || '')
                        baseTop = Number.isFinite(topCss) ? topCss : rect.top
                        setTop(Math.ceil(baseTop + sel.offsetHeight + GAP))
                    } else {
                        // non-fixed: account for visual viewport offset to align with fixed overlays
                        setTop(Math.ceil(rect.bottom + vvOffsetTop + GAP))
                    }
                } else {
                    setTop(72)
                }
            } catch {
                setTop(72)
            }
        }
        const update = () => { try { requestAnimationFrame(() => compute()) } catch { compute() } }
        update()
        const ro = new ResizeObserver(() => update())
        try { const el = document.querySelector('.level-selector'); if (el) ro.observe(el as Element) } catch { }
        window.addEventListener('resize', update)
        window.addEventListener('orientationchange', update)
        try {
            const vv = (window as any).visualViewport
            if (vv && vv.addEventListener) { vv.addEventListener('resize', update); vv.addEventListener('scroll', update) }
        } catch { }
        const mo = new MutationObserver(update)
        mo.observe(document.body, { childList: true, subtree: true })
        return () => {
            try { ro.disconnect() } catch { }
            window.removeEventListener('resize', update)
            window.removeEventListener('orientationchange', update)
            try { const vv = (window as any).visualViewport; if (vv && vv.removeEventListener) { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) } } catch { }
            try { mo.disconnect() } catch { }
        }
    }, [])

    // React to UI show/hide events (navigation mode). Also hide the native geolocate dot/accuracy circle.
    useEffect(() => {
        const hide = () => {
            setVisible(false)
            try {
                const container = (map as any)?.getContainer?.() as HTMLElement | null
                if (container) container.setAttribute('data-hide-geolocate', '1')
            } catch { }
        }
        const show = () => {
            setVisible(true)
            try {
                const container = (map as any)?.getContainer?.() as HTMLElement | null
                if (container) container.removeAttribute('data-hide-geolocate')
            } catch { }
        }
        window.addEventListener('ui:hide-geolocate', hide as any)
        window.addEventListener('ui:show-geolocate', show as any)
        return () => {
            window.removeEventListener('ui:hide-geolocate', hide as any)
            window.removeEventListener('ui:show-geolocate', show as any)
        }
    }, [])

    const trigger = () => {
        try { (controlRef.current as any)?.trigger?.() } catch { }
        // fallback: click hidden control button
        try {
            const container = (map as any)?.getContainer?.()
            const btn = container ? container.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-geolocate button') as HTMLButtonElement | null : null
            if (btn) btn.click()
        } catch { }
    }

    useEffect(() => {
        const onTrigger = () => trigger()
        window.addEventListener('ui:trigger-geolocate', onTrigger as any)
        return () => window.removeEventListener('ui:trigger-geolocate', onTrigger as any)
    }, [])

    return (
        <>
            <button
                title="Me localiser"
                aria-label="Me localiser"
                onClick={trigger}
                className="fixed right-[10px] z-[28] w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
                style={{ top: top ?? 72, display: visible ? 'flex' : 'none' }}
            >
                <LocationArrow className="w-5 h-5" />
            </button>
            <button
                title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                onClick={() => onToggleTheme && onToggleTheme()}
                className="fixed z-[28] w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
                style={{ right: 10 + 44 + 8, top: top ?? 72 }}
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
        </>
    )
}

export default UserGeolocate
