import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function BottomSheetBase({
    open,
    header,
    children,
    initialSnap = 0.5,
    snapPercents = [0.05, 0.2, 0.5, 0.9],
    reduceOnOutsideClick = true,
    apiRef,
}: {
    open: boolean,
    header?: any,
    children: any,
    initialSnap?: number,
    snapPercents?: number[],
    reduceOnOutsideClick?: boolean,
    apiRef?: { current: null | { snapTo: (index: number) => void, snapToMin: () => void } }
}) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [height, setHeight] = useState(0)
    const snapPixels = useRef<number[]>([])
    const [activeIndex, setActiveIndex] = useState<number>(2)
    const currentHeightRef = useRef<number>(0)
    const initialized = useRef<boolean>(false)

    const computeSnaps = useCallback(() => {
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        const snaps = snapPercents
            .map(p => Math.round(vh * Math.max(0.02, Math.min(0.98, p))))
            .sort((a, b) => a - b)
        snapPixels.current = snaps
        // find closest to current height if initialized; else use initialSnap
        const target = (initialized.current && currentHeightRef.current > 0)
            ? currentHeightRef.current
            : Math.round(vh * initialSnap)
        let idx = 0, best = Infinity
        snaps.forEach((v, i) => { const d = Math.abs(v - target); if (d < best) { best = d; idx = i } })
        setActiveIndex(idx)
        currentHeightRef.current = snaps[idx]
        setHeight(snaps[idx])
        initialized.current = true
    }, [initialSnap, snapPercents])

    useEffect(() => { computeSnaps() }, [computeSnaps])
    useEffect(() => {
        const onR = () => computeSnaps()
        window.addEventListener('resize', onR)
        return () => window.removeEventListener('resize', onR)
    }, [computeSnaps])
    // expose API to parent via ref
    useEffect(() => {
        if (!apiRef) return
        apiRef.current = {
            snapTo: (index: number) => {
                const snaps = snapPixels.current
                const idx = Math.max(0, Math.min(snaps.length - 1, index))
                setActiveIndex(idx)
                currentHeightRef.current = snaps[idx]
                setHeight(snaps[idx])
            },
            snapToMin: () => {
                const snaps = snapPixels.current
                const idx = 0
                setActiveIndex(idx)
                currentHeightRef.current = snaps[idx]
                setHeight(snaps[idx])
            }
        }
        return () => { if (apiRef) apiRef.current = null }
    }, [apiRef])
    useEffect(() => {
        let dragging = false
        let startY = 0
        let startHeight = 0
        const threshold = 5 // px before we consider it a drag

        function onMove(e: TouchEvent | MouseEvent) {
            const clientY = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
            if (!dragging) {
                const dy = Math.abs(clientY - startY)
                if (dy < threshold) return
                dragging = true
            }
            // Delta-based height change so the sheet top doesn't jump to the finger
            const dy = clientY - startY
            const target = startHeight - dy
            const minH = snapPixels.current[0] ?? 40
            const maxH = snapPixels.current[snapPixels.current.length - 1] ?? (typeof window !== 'undefined' ? window.innerHeight * 0.9 : 800)
            const h = Math.max(minH, Math.min(maxH, target))
            currentHeightRef.current = h
            setHeight(h)
        }
        function onEnd() {
            document.removeEventListener('touchmove', onMove as any)
            document.removeEventListener('mousemove', onMove as any)
            // snap to nearest
            const snaps = snapPixels.current
            let idx = 0, best = Infinity
            const h = currentHeightRef.current || height
            snaps.forEach((v, i) => { const d = Math.abs(v - h); if (d < best) { best = d; idx = i } })
            setActiveIndex(idx)
            currentHeightRef.current = snaps[idx]
            setHeight(snaps[idx])
            dragging = false
        }
        const root = ref.current as HTMLElement | null
        const handle = root?.querySelector('.grab-handle') as HTMLElement | null
        const startDrag = (ev: Event) => {
            // If the initial target is an interactive control, do not start drag to preserve single-click
            const target = ev.target as HTMLElement | null
            if (target && (target.closest('button, a, input, select, textarea, [role="button"], [role="link"]'))) return
            // If starting inside scrollable content that can scroll further, let it scroll instead of dragging the sheet
            const contentEl = target?.closest('.sheet-content') as HTMLElement | null
            if (contentEl) {
                const canScroll = contentEl.scrollHeight > contentEl.clientHeight
                if (canScroll) {
                    // Determine if at extremes; only start dragging if user pulls beyond extremes (overscroll intent is tricky to detect without dy)
                    const atTop = contentEl.scrollTop <= 0
                    const atBottom = Math.ceil(contentEl.scrollTop + contentEl.clientHeight) >= contentEl.scrollHeight
                    // For initial start, we don't know direction yet; allow scroll by default
                    if (!atTop && !atBottom) return
                }
            }
            ev.preventDefault?.()
            const clientY = (ev as any).touches ? (ev as any).touches[0].clientY : (ev as MouseEvent).clientY
            startY = clientY
            startHeight = currentHeightRef.current || height
            document.addEventListener('touchmove', onMove as any, { passive: false })
            document.addEventListener('mousemove', onMove as any)
            document.addEventListener('touchend', onEnd as any, { once: true })
            document.addEventListener('mouseup', onEnd as any, { once: true })
        }
        // drag only from the handle to avoid intercepting clicks inside the content
        handle?.addEventListener('mousedown', startDrag)
        handle?.addEventListener('touchstart', startDrag, { passive: false })
        return () => {
            handle?.removeEventListener('mousedown', startDrag)
            handle?.removeEventListener('touchstart', startDrag as any)
        }
    }, [height])

    // Reduce to bottom snap on outside click, but let the click pass to the app (no overlay)
    useEffect(() => {
        if (!open || !reduceOnOutsideClick) return
        const onOutside = (e: Event) => {
            const root = ref.current
            const target = e.target as Node | null
            if (!root || !target) return
            if (!root.contains(target)) {
                const snaps = snapPixels.current
                const idx = 0 // bottom-most
                setActiveIndex(idx)
                currentHeightRef.current = snaps[idx]
                setHeight(snaps[idx])
                // do not stop propagation; allow underlying app interaction
            }
        }
        document.addEventListener('pointerdown', onOutside, { capture: true })
        return () => document.removeEventListener('pointerdown', onOutside, { capture: true } as any)
    }, [open, reduceOnOutsideClick])

    const cycleSnap = useCallback(() => {
        const snaps = snapPixels.current
        const next = Math.min(snaps.length - 1, activeIndex + 1)
        setActiveIndex(next)
        setHeight(snaps[next])
    }, [activeIndex])
    if (!open) return null
    // Detect dark mode
    const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches)
    const bg = isDark ? '#181a20' : '#fff'
    const fg = isDark ? '#f5f7fb' : '#111'
    const border = isDark ? '#333' : '#e3e3e3'
    const grabBg = isDark ? '#444' : '#ccc'
    return (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: 'none' }}>
            <div
                ref={ref}
                style={{
                    position: 'relative',
                    margin: '0 auto',
                    maxWidth: 720,
                    height,
                    background: bg,
                    color: fg,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    boxShadow: isDark ? '0 -6px 18px rgba(0,0,0,0.38)' : '0 -6px 18px rgba(0,0,0,0.18)',
                    border: `1px solid ${border}`,
                    touchAction: 'none',
                    transition: 'height 0.35s cubic-bezier(.4,1.2,.4,1)',
                    willChange: 'height',
                    overflow: 'hidden',
                }}
            >
                <div className="grab-area" style={{ height: 24, paddingTop: 8, pointerEvents: 'auto' }}>
                    <div
                        className="grab-handle"
                        onClick={cycleSnap}
                        style={{ width: 48, height: 8, borderRadius: 4, background: grabBg, margin: '0 auto', cursor: 'grab' }}
                    />
                </div>
                {header && <div style={{ padding: '4px 12px 0', fontWeight: 700, pointerEvents: 'auto' }}>{header}</div>}
                <div className="sheet-content" style={{ padding: 12, overflow: 'auto', height: Math.max(0, height - 64), pointerEvents: 'auto' }}>{children}</div>
            </div>
        </div>
    )
}

export type RouteItem = { id: string, layerId: string, distance: number, time: number, index?: number, steps?: Array<{ distance: number, coords: [number[], number[]], fromId?: string, toId?: string }> }

export function isMobileViewport() {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
}

export function formatEta(seconds: number) {
    const mins = Math.round(seconds / 60)
    return `${mins} min`
}

export function formatDistance(meters: number) {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
}

export function RoutesBottomSheet({
    routes,
    open,
    onSelect,
}: {
    routes: RouteItem[]
    open: boolean
    onSelect: (rt: RouteItem) => void
}) {
    // Detect dark mode
    const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches)
    return (
        <BottomSheetBase open={open} header={<div style={{ fontWeight: 700 }}>Itinéraires</div>} initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {routes.map((r, i) => {
                    const primary = i === 0
                    const color = primary ? '#007bff' : (i === 1 ? (isDark ? '#888' : '#999') : (isDark ? '#444' : '#ccc'))
                    return (
                        <button key={r.id} onClick={() => onSelect(r)} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 12,
                            border: `1px solid ${isDark ? '#333' : '#e3e3e3'}`,
                            background: isDark ? '#23242a' : '#fff', color: isDark ? '#f5f7fb' : '#111'
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700 }}>{primary ? 'Plus court' : `Alternative ${i}`}</div>
                                <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{formatDistance(r.distance)} • {formatEta(r.time)}</div>
                            </div>
                            <div style={{ width: 14, height: 14, borderRadius: 7, background: color }} />
                        </button>
                    )
                })}
            </div>
        </BottomSheetBase>
    )
}

export function RouteDetailsBottomSheet({
    open,
    route,
    onStart,
    arrivalTime,
}: {
    open: boolean
    route: RouteItem | null
    onStart: (rt: RouteItem) => void
    arrivalTime?: Date | null
}) {
    if (!route) return null
    const eta = formatEta(route.time)
    const dist = formatDistance(route.distance)
    const arrStr = useMemo(() => arrivalTime ? arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null, [arrivalTime])
    // Detect dark mode
    const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches)
    return (
        <BottomSheetBase open={open} reduceOnOutsideClick={false} header={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                {/* Bouton retour */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button aria-label="Retour" title="Retour" onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('route-details-back')) }}
                        style={{ marginRight: 8, background: 'none', border: 'none', color: isDark ? '#f5f7fb' : '#111', fontSize: 20, cursor: 'pointer', padding: 0, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 700 }}>&larr;</span>
                    </button>
                    <div style={{ fontWeight: 700 }}>Trajet sélectionné</div>
                </div>
            </div>
        } initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>Durée</div>
                        <div style={{ fontWeight: 700 }}>{eta}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>Distance</div>
                        <div style={{ fontWeight: 700 }}>{dist}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>Arrivée</div>
                        <div style={{ fontWeight: 700 }}>{arrStr ?? '-'}</div>
                    </div>
                </div>

                <button onClick={() => onStart(route)} style={{ padding: '12px 16px', borderRadius: 12, border: 'none', background: isDark ? '#4da6ff' : '#111', color: isDark ? '#181a20' : '#fff', fontWeight: 700 }}>Démarrer</button>

                {route.steps && route.steps.length > 0 && (
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Étapes</div>
                        <ol style={{ listStyle: 'decimal', paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {route.steps.slice(0, 12).map((s, i) => (
                                <li key={i} style={{ fontSize: 13, color: isDark ? '#eee' : '#333', cursor: 'pointer' }} onClick={() => {
                                    try {
                                        if (s && s.coords && Array.isArray(s.coords) && s.coords.length === 2) {
                                            const a = s.coords[0]
                                            const b = s.coords[1]
                                            const minX = Math.min(a[0], b[0])
                                            const minY = Math.min(a[1], b[1])
                                            const maxX = Math.max(a[0], b[0])
                                            const maxY = Math.max(a[1], b[1])
                                            const bounds: [[number, number], [number, number]] = [[minX, minY], [maxX, maxY]]
                                            window.dispatchEvent(new CustomEvent('nav:focus-step-bounds', { detail: bounds }))
                                        }
                                        const lvl = (s as any).level
                                        if (lvl != null) {
                                            const n = typeof lvl === 'string' ? parseInt(lvl, 10) : lvl
                                            if (!Number.isNaN(n)) window.dispatchEvent(new CustomEvent('ui:set-level', { detail: n }))
                                        }
                                    } catch { }
                                }}>
                                    {(() => {
                                        if ((s as any).type === 'floor-change') {
                                            const dir = (s as any).direction
                                            const toL = (s as any).toLevel
                                            if (dir === 'up') return `Monter un étage (Niveau ${toL})`
                                            if (dir === 'down') return `Descendre un étage (Niveau ${toL})`
                                        }
                                        return `Avancez ${formatDistance(s.distance)}`
                                    })()}
                                </li>
                            ))}
                            {route.steps.length > 12 && (
                                <li style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>… {route.steps.length - 12} étapes supplémentaires</li>
                            )}
                        </ol>
                    </div>
                )}
            </div>
        </BottomSheetBase>
    )
}
