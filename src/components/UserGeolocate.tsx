import React, { useEffect, useRef, useState } from 'react'
import maplibre from 'maplibre-gl'

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
                className="geolocate-button"
                style={{ position: 'fixed', right: 10, top: top ?? 72, zIndex: 28, width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: visible ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
            >📍</button>
            <button
                title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                onClick={() => onToggleTheme && onToggleTheme()}
                className="theme-toggle-button"
                style={{ position: 'fixed', right: 10 + 44 + 8, top: top ?? 72, zIndex: 28, width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
            >{theme === 'dark' ? '☀️' : '🌙'}</button>
        </>
    )
}

export default UserGeolocate
