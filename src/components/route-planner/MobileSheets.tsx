import { useEffect, useMemo, useRef } from 'react'
import { BottomSheet } from 'react-spring-bottom-sheet'

export function BottomSheetBase({
    open,
    header,
    children,
    initialSnap = 0.5,
    snapPercents = [0.05, 0.2, 0.5, 0.9],
    reduceOnOutsideClick = true,
    minPeekPx = 48,
    apiRef,
}: {
    open: boolean,
    header?: any,
    children: any,
    initialSnap?: number,
    snapPercents?: number[],
    reduceOnOutsideClick?: boolean,
    /** Minimum height when minimized (allows going smaller than content). */
    minPeekPx?: number,
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

    // Colors are now driven by CSS variables set by the app theme

    // Map percents to library snap points and default snap.
    // Be compatible with both signatures used by react-spring-bottom-sheet:
    // - defaultSnap(maxHeight: number)
    // - snapPoints(maxHeight: number) or snapPoints(maxHeight: number, minHeight: number)
    // Some versions may call with a single object arg; support that too.
    const coerceDims = (a: any, b?: any): { maxHeight: number, minHeight: number } => {
        let maxHeight: number | undefined
        let minHeight: number | undefined
        if (typeof a === 'number') {
            maxHeight = a
            if (typeof b === 'number') minHeight = b
        } else if (a && typeof a === 'object') {
            if (typeof a.maxHeight === 'number') maxHeight = a.maxHeight
            if (typeof a.minHeight === 'number') minHeight = a.minHeight
        }
        // Fallbacks to avoid undefined propagating
        maxHeight = typeof maxHeight === 'number' && isFinite(maxHeight) ? maxHeight : 600
        minHeight = typeof minHeight === 'number' && isFinite(minHeight) ? minHeight : Math.max(56, Math.round(maxHeight * 0.12))
        // Clamp sanity
        minHeight = Math.max(1, Math.min(minHeight, maxHeight))
        return { maxHeight, minHeight }
    }

    const defaultSnap = (a: any, b?: any) => {
        const { maxHeight } = coerceDims(a, b)
        const p = Math.max(0.02, Math.min(0.98, initialSnap))
        const target = Math.round(maxHeight * p)
        const percBase = sortedPercents.current.length
            ? sortedPercents.current.map((sp) => Math.round(maxHeight * sp))
            : [Math.round(maxHeight * 0.12), Math.round(maxHeight * 0.28), Math.round(maxHeight * 0.5), Math.round(maxHeight * 0.86)]
        // Always include a small peek snap smaller than content
        const peek = Math.max(1, Math.min(maxHeight, Math.round(minPeekPx)))
        const snaps = Array.from(new Set([peek, ...percBase].map(v => Math.max(peek, Math.min(maxHeight, v))))).sort((a, b) => a - b)
        // choose nearest available snap point
        let best = snaps[0]
        let bestD = Math.abs(snaps[0] - target)
        for (let i = 1; i < snaps.length; i++) {
            const d = Math.abs(snaps[i] - target)
            if (d < bestD) { bestD = d; best = snaps[i] }
        }
        return best
    }
    const snapPoints = (a: any, b?: any) => {
        const { maxHeight } = coerceDims(a, b)
        // Map percents to px and clamp to [minPeekPx, maxHeight]
        const percBase = sortedPercents.current.length
            ? sortedPercents.current.map((p) => Math.round(maxHeight * p))
            : [Math.round(maxHeight * 0.5), Math.round(maxHeight * 0.9)]
        const peek = Math.max(1, Math.min(maxHeight, Math.round(minPeekPx)))
        const snaps = Array.from(new Set([peek, ...percBase].map(v => Math.max(peek, Math.min(maxHeight, v))))).sort((a, b) => a - b)
        snapsPxRef.current = snaps
        return snaps
    }

    if (!open) return null
    return (
        <BottomSheet
            ref={sheetRef}
            open={open}
            blocking={false}
            onDismiss={() => {
                // Always snap back to the minimum height instead of closing completely.
                // Use rAF to avoid racing with internal close animation (prevents getValue undefined).
                try {
                    const snaps = snapsPxRef.current
                    if (Array.isArray(snaps) && snaps.length) {
                        requestAnimationFrame(() => sheetRef.current?.snapTo?.(snaps[0]))
                    }
                } catch { /* no-op */ }
                // Read the flag to satisfy TS strict unused checks and allow future tweaks
                const _respectOutside = !!reduceOnOutsideClick
                void _respectOutside
            }}
            header={header ? (
                <div className="font-bold text-gray-900 dark:text-gray-100">
                    {header}
                </div>
            ) : undefined}
            defaultSnap={defaultSnap}
            snapPoints={snapPoints}
            expandOnContentDrag
        >
            <div className="p-3">{children}</div>
        </BottomSheet>
    )
}

export type RouteItem = {
    id: string,
    layerId: string,
    distance: number,
    time: number,
    index?: number,
    steps?: Array<{ distance: number, coords: [number[], number[]], fromId?: string, toId?: string, type?: string, direction?: string, level?: number }>,
    maneuvers?: Array<{ at: number, type: string, idx?: number }>,
    // live fields (not persisted): controller will publish these via events/state
    __along?: number
}

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
    // Colors via CSS vars
    return (
        <BottomSheetBase open={open} header={<div className="font-bold">Itinéraires</div>} initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]} minPeekPx={40}>
            <div className="flex flex-col gap-2">
                {routes.map((r, i) => {
                    const primary = i === 0
                    const color = primary ? '#007bff' : (i === 1 ? 'var(--list-item-muted, #999)' : 'var(--panel-border, #ccc)')
                    return (
                        <button
                            key={r.id}
                            onClick={() => onSelect(r)}
                            className="flex justify-between items-center px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="text-left">
                                <div className="font-bold">{primary ? 'Plus court' : `Alternative ${i}`}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{formatDistance(r.distance)} • {formatEta(r.time)}</div>
                            </div>
                            <div className="w-3.5 h-3.5 rounded-full" style={{ background: color }} />
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
    const iconFor = (type: string) => {
        const style: any = { width: 18, height: 18, display: 'inline-block', marginRight: 6 }
        switch (type) {
            case 'turn-right': return (<span aria-hidden style={style}>↱</span>)
            case 'turn-left': return (<span aria-hidden style={style}>↰</span>)
            case 'turn-slight-right': return (<span aria-hidden style={style}>↗</span>)
            case 'turn-slight-left': return (<span aria-hidden style={style}>↖</span>)
            case 'uturn': return (<span aria-hidden style={style}>⤴</span>)
            case 'floor-up': return (<span aria-hidden style={style}>🧭⬆︎</span>)
            case 'floor-down': return (<span aria-hidden style={style}>🧭⬇︎</span>)
            case 'arrive': return (<span aria-hidden style={style}>🏁</span>)
            default: return (<span aria-hidden style={style}>➡</span>)
        }
    }
    const instructionFr = (type: string, meters: number) => {
        const d = Math.max(0, Math.round(meters))
        switch (type) {
            case 'turn-right': return `dans ${d} m, tournez à droite`
            case 'turn-left': return `dans ${d} m, tournez à gauche`
            case 'turn-slight-right': return `dans ${d} m, tournez légèrement à droite`
            case 'turn-slight-left': return `dans ${d} m, tournez légèrement à gauche`
            case 'uturn': return `dans ${d} m, faites demi-tour`
            case 'floor-up': return `dans ${d} m, montez un étage`
            case 'floor-down': return `dans ${d} m, descendez d'un étage`
            case 'arrive': return d > 0 ? `dans ${d} m, vous êtes arrivé` : `Vous êtes arrivé`
            default: return `dans ${d} m, continuez tout droit`
        }
    }
    // Colors via CSS vars
    return (
        <BottomSheetBase open={open} reduceOnOutsideClick={false} header={
            <div className="flex items-center justify-start">
                {/* Bouton retour */}
                <div className="flex items-center">
                    <button
                        aria-label="Retour"
                        title="Retour"
                        onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('route-details-back')) }}
                        className="mr-2 bg-transparent border-none text-gray-900 dark:text-gray-100 text-xl cursor-pointer p-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className="font-bold">&larr;</span>
                    </button>
                    <div className="font-bold">Trajet sélectionné</div>
                </div>
            </div>
        } initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]} minPeekPx={40}>
            <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Durée</div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{eta}</div>
                    </div>
                    <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Distance</div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{dist}</div>
                    </div>
                    <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Arrivée</div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{arrStr ?? '-'}</div>
                    </div>
                </div>

                <button
                    onClick={() => onStart(route)}
                    className="px-4 py-3 rounded-xl border-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                    Démarrer
                </button>

                {route.steps && route.steps.length > 0 && (
                    <div>
                        <div className="font-bold mb-1.5 text-gray-900 dark:text-gray-100">Étapes</div>
                        <ol className="list-decimal pl-4 m-0 flex flex-col gap-1.5">
                            {(() => {
                                const steps = route.steps || []
                                const cumEnds: number[] = []
                                let run = 0
                                for (let i = 0; i < steps.length; i++) { run += Math.max(0, Number(steps[i]?.distance || 0)); cumEnds.push(run) }
                                return steps.slice(0, 12).map((s, i) => (
                                    <li key={i} className="text-[13px] text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={() => {
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
                                            const manList: Array<any> = Array.isArray((route as any).maneuvers) ? (route as any).maneuvers : []
                                            const at = cumEnds[i]
                                            let man = manList.find(m => (m.at || 0) >= at)
                                            if ((s as any).type === 'floor-change') {
                                                const dir = (s as any).direction
                                                const t = dir === 'up' ? 'floor-up' : 'floor-down'
                                                man = { at, type: t }
                                            }
                                            const prevAt = (i === 0 ? 0 : cumEnds[i - 1])
                                            const distanceTo = Math.max(0, (man?.at || at) - prevAt)
                                            const t = man?.type || 'continue'
                                            return (
                                                <div className="flex items-center">
                                                    {iconFor(t)}
                                                    <span>{instructionFr(t, distanceTo)}</span>
                                                </div>
                                            )
                                        })()}
                                    </li>
                                ))
                            })()}
                            {route.steps.length > 12 && (
                                <li className="text-xs text-gray-600 dark:text-gray-400">… {route.steps.length - 12} étapes supplémentaires</li>
                            )}
                        </ol>
                    </div>
                )}
            </div>
        </BottomSheetBase>
    )
}
