import { useEffect, useMemo, useRef } from 'react'
import { BottomSheet } from 'react-spring-bottom-sheet'

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
    // Clamp and sort snap percentages once
    const sortedPercents = useRef<number[]>([])
    const snapsPxRef = useRef<number[]>([])
    const sheetRef = useRef<any>(null)

    useEffect(() => {
        const clamped = (snapPercents || [0.05, 0.2, 0.5, 0.9])
            .map((p) => Math.max(0.02, Math.min(0.98, p)))
            .sort((a, b) => a - b)
        sortedPercents.current = clamped
    }, [snapPercents])

    // expose API using the computed pixel snap points
    useEffect(() => {
        if (!apiRef) return
        apiRef.current = {
            snapTo: (index: number) => {
                const snaps = snapsPxRef.current
                if (!snaps.length) return
                const i = Math.max(0, Math.min(snaps.length - 1, index))
                sheetRef.current?.snapTo(snaps[i])
            },
            snapToMin: () => {
                const snaps = snapsPxRef.current
                if (!snaps.length) return
                sheetRef.current?.snapTo(snaps[0])
            },
        }
        return () => { if (apiRef) apiRef.current = null }
    }, [apiRef])

    // Dark mode styling for header text only (library provides base styles)
    const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches)

    // Map percents to library snap points and default snap
    const defaultSnap = ({ maxHeight }: { maxHeight: number }) => {
        const p = Math.max(0.02, Math.min(0.98, initialSnap))
        return Math.round(maxHeight * p)
    }
    const snapPoints = ({ maxHeight, minHeight }: { maxHeight: number, minHeight: number }) => {
        // Ensure we always have at least the minHeight as first snap
        const snaps = sortedPercents.current.length
            ? sortedPercents.current.map((p) => Math.round(maxHeight * p))
            : [minHeight, Math.round(maxHeight * 0.5), Math.round(maxHeight * 0.9)]
        snapsPxRef.current = snaps
        return snaps
    }

    if (!open) return null
    return (
        <BottomSheet
            ref={sheetRef}
            open={open}
            blocking={!reduceOnOutsideClick}
            onDismiss={() => {
                // Reduce instead of closing when clicking outside, if allowed
                if (reduceOnOutsideClick) {
                    const snaps = snapsPxRef.current
                    if (snaps.length) sheetRef.current?.snapTo(snaps[0])
                }
            }}
            header={header ? (
                <div style={{ fontWeight: 700, color: isDark ? '#f5f7fb' : '#111' }}>
                    {header}
                </div>
            ) : undefined}
            defaultSnap={defaultSnap}
            snapPoints={snapPoints}
            expandOnContentDrag
        >
            <div style={{ padding: 12 }}>{children}</div>
        </BottomSheet>
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
