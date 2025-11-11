import { useEffect, useRef, useState } from 'react'
import { LocationArrow, Sun, Moon } from '@gravity-ui/icons'
import maplibre from 'maplibre-gl'

type Props = {
    map?: maplibre.Map | null
    theme?: 'light' | 'dark'
    onToggleTheme?: () => void
    level: number
    levels: number[]
    loading: boolean
    onLevelChange: (n: number) => void
}

/**
 * Mobile-only controls bar that positions itself below the SearchBar.
 * Contains: Level selector, Geolocate button, and Dark mode button.
 * Only visible on mobile (<= 720px).
 */
export default function MobileControlsBar({
    map,
    theme = 'light',
    onToggleTheme,
    level,
    levels,
    loading,
    onLevelChange
}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [topPosition, setTopPosition] = useState<number>(75)
    const [visible, setVisible] = useState<boolean>(true)
    const geolocateControlRef = useRef<maplibre.GeolocateControl | null>(null)

    // Touch handling for level selector swipe
    const touchStartY = useRef<number | null>(null)
    const levelRef = useRef(level)
    const levelsRef = useRef(levels)
    const onLevelChangeRef = useRef(onLevelChange)

    useEffect(() => { levelRef.current = level }, [level])
    useEffect(() => { levelsRef.current = levels }, [levels])
    useEffect(() => { onLevelChangeRef.current = onLevelChange }, [onLevelChange])

    const changeByIndex = (dir: number) => {
        const lvls = levelsRef.current
        if (!lvls || lvls.length === 0) return
        const idx = lvls.indexOf(levelRef.current)
        if (idx === -1) return
        const next = Math.min(lvls.length - 1, Math.max(0, idx + dir))
        if (next !== idx) onLevelChangeRef.current(lvls[next])
    }

    // Install hidden geolocate control
    useEffect(() => {
        if (!map) return
        if (!geolocateControlRef.current) {
            geolocateControlRef.current = new maplibre.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true
            })
            try {
                map.addControl(geolocateControlRef.current, 'top-right')
            } catch (e) { }
            // Hide the default control UI
            try {
                const container = (map as any).getContainer ? (map as any).getContainer() : null
                const el = container ? container.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-geolocate') as HTMLElement | null : null
                if (el) el.style.display = 'none'
            } catch (e) { }
        }
        return () => {
            if (geolocateControlRef.current) {
                try { map.removeControl(geolocateControlRef.current) } catch (e) { }
                geolocateControlRef.current = null
            }
        }
    }, [map])

    // Calculate position below SearchBar
    useEffect(() => {
        const computePosition = () => {
            try {
                const searchBar = document.querySelector('.searchbar') as HTMLElement | null
                const routePlanner = document.querySelector('.route-planner') as HTMLElement | null
                const navBanner = document.querySelector('.nav-banner') as HTMLElement | null

                let maxBottom = 15 // Default top margin

                // Helper to find the lowest bottom position
                const considerElement = (el: HTMLElement | null) => {
                    if (!el) return
                    try {
                        const rect = el.getBoundingClientRect()
                        // Ignore if element has no size
                        if (rect.height <= 0 || rect.width <= 0) return

                        const vv = (window as any).visualViewport
                        const offsetTop = vv && typeof vv.offsetTop === 'number' ? vv.offsetTop : 0
                        const bottomInLayout = rect.bottom + offsetTop

                        if (bottomInLayout > maxBottom) {
                            maxBottom = bottomInLayout
                        }
                    } catch (e) { }
                }

                considerElement(searchBar)
                considerElement(routePlanner)
                considerElement(navBanner)

                // Add gap below
                const GAP = 14
                setTopPosition(Math.ceil(maxBottom + GAP))
            } catch (e) {
                setTopPosition(75) // Fallback
            }
        }

        const update = () => {
            try {
                requestAnimationFrame(() => computePosition())
            } catch {
                computePosition()
            }
        }

        // Initial computation
        update()

        // Observe DOM changes
        const mutationObserver = new MutationObserver(update)
        mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true })

        // Observe window events
        window.addEventListener('resize', update)
        window.addEventListener('orientationchange', update)

        // Observe visual viewport changes (mobile keyboard, etc.)
        try {
            const vv = (window as any).visualViewport
            if (vv && vv.addEventListener) {
                vv.addEventListener('resize', update)
                vv.addEventListener('scroll', update)
            }
        } catch (e) { }

        // Observe SearchBar size changes
        let resizeObserver: ResizeObserver | null = null
        try {
            const searchBar = document.querySelector('.searchbar')
            if (searchBar && 'ResizeObserver' in window) {
                resizeObserver = new ResizeObserver(update)
                resizeObserver.observe(searchBar)
            }
        } catch (e) { }

        return () => {
            mutationObserver.disconnect()
            window.removeEventListener('resize', update)
            window.removeEventListener('orientationchange', update)
            if (resizeObserver) resizeObserver.disconnect()
            try {
                const vv = (window as any).visualViewport
                if (vv && vv.removeEventListener) {
                    vv.removeEventListener('resize', update)
                    vv.removeEventListener('scroll', update)
                }
            } catch (e) { }
        }
    }, [])

    // React to UI show/hide events (navigation mode)
    useEffect(() => {
        const hide = () => {
            setVisible(false)
            // Hide native geolocate dot/accuracy circle
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
    }, [map])

    // Listen for external geolocate trigger
    useEffect(() => {
        const onTrigger = () => triggerGeolocate()
        window.addEventListener('ui:trigger-geolocate', onTrigger as any)
        return () => window.removeEventListener('ui:trigger-geolocate', onTrigger as any)
    }, [])

    // Install non-passive wheel listener for level selector
    useEffect(() => {
        const el = containerRef.current?.querySelector('.level-select-wrapper')
        if (!el) return
        const handler = (ev: Event) => {
            const wheelEv = ev as WheelEvent
            if (!wheelEv.deltaY) return
            try { ev.preventDefault() } catch { }
            changeByIndex(wheelEv.deltaY > 0 ? 1 : -1)
        }
        try {
            el.addEventListener('wheel', handler, { passive: false } as any)
        } catch {
            el.addEventListener('wheel', handler)
        }
        return () => {
            try { el.removeEventListener('wheel', handler) } catch { }
        }
    }, [])

    const triggerGeolocate = () => {
        try {
            (geolocateControlRef.current as any)?.trigger?.()
        } catch { }
        // Fallback: click hidden control button
        try {
            const container = (map as any)?.getContainer?.()
            const btn = container ? container.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-geolocate button') as HTMLButtonElement | null : null
            if (btn) btn.click()
        } catch { }
    }

    // Touch handlers for level selector
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0]?.clientY ?? null
    }

    const onTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation()
    }

    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current === null) return
        const endY = e.changedTouches[0]?.clientY ?? touchStartY.current
        const dy = endY - touchStartY.current
        const threshold = 30
        if (Math.abs(dy) >= threshold) {
            changeByIndex(dy > 0 ? 1 : -1)
        }
        touchStartY.current = null
    }

    // Only show on mobile
    if (typeof window !== 'undefined' && window.innerWidth > 720) {
        return null
    }

    if (!visible) {
        return null
    }

    return (
        <div
            ref={containerRef}
            className="fixed right-3 z-controls flex items-center gap-2"
            style={{ top: topPosition }}
        >
            {/* Level Selector */}
            <div
                className="level-select-wrapper bg-black/50 dark:bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg text-white shadow-lg flex items-center gap-2 flex-1"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <label htmlFor="mobile-level-select" className="text-sm font-medium whitespace-nowrap">
                    Niveau :
                </label>
                <select
                    id="mobile-level-select"
                    value={level}
                    onChange={e => onLevelChange(Number(e.target.value))}
                    disabled={loading || levels.length === 0}
                    className="bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
                >
                    {loading ? (
                        <option>Chargement...</option>
                    ) : levels.length === 0 ? (
                        <option>Aucun niveau</option>
                    ) : (
                        levels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)
                    )}
                </select>
            </div>

            {/* Geolocate Button */}
            <button
                title="Me localiser"
                aria-label="Me localiser"
                onClick={triggerGeolocate}
                className="w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center flex-shrink-0"
            >
                <LocationArrow className="w-5 h-5" />
            </button>

            {/* Dark Mode Button */}
            <button
                title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                onClick={() => onToggleTheme && onToggleTheme()}
                className="w-11 h-11 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center flex-shrink-0"
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
        </div>
    )
}
