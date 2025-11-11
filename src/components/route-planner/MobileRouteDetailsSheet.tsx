import { useMemo } from 'react'
import { ArrowLeft } from '@gravity-ui/icons'
import { BottomSheetBase } from './BottomSheetBase'
import type { RouteItem } from './MobileSheets'
import { formatEta, formatDistance } from './MobileSheets'

export function MobileRouteDetailsSheet({
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
        const className = "w-[18px] h-[18px] inline-block mr-1.5"
        switch (type) {
            case 'turn-right': return (<span aria-hidden className={className}>↱</span>)
            case 'turn-left': return (<span aria-hidden className={className}>↰</span>)
            case 'turn-slight-right': return (<span aria-hidden className={className}>↗</span>)
            case 'turn-slight-left': return (<span aria-hidden className={className}>↖</span>)
            case 'uturn': return (<span aria-hidden className={className}>⤴</span>)
            case 'floor-up': return (<span aria-hidden className={className}>🧭⬆︎</span>)
            case 'floor-down': return (<span aria-hidden className={className}>🧭⬇︎</span>)
            case 'arrive': return (<span aria-hidden className={className}>🏁</span>)
            default: return (<span aria-hidden className={className}>➡</span>)
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
    return (
        <BottomSheetBase open={open} reduceOnOutsideClick={false} header={
            <div className="flex items-center justify-start">
                <div className="flex items-center">
                    <button
                        aria-label="Retour"
                        title="Retour"
                        onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('route-details-back')) }}
                        className="mr-2 bg-transparent border-none text-gray-900 dark:text-gray-100 text-xl cursor-pointer p-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 font-bold" />
                    </button>
                    <div className="font-bold">Trajet sélectionné</div>
                </div>
            </div>
        } initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]} minPeekPx={40}>
            <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Durée</div>
                        <div className="font-bold">{eta}</div>
                    </div>
                    <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Distance</div>
                        <div className="font-bold">{dist}</div>
                    </div>
                    <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Arrivée</div>
                        <div className="font-bold">{arrStr ?? '-'}</div>
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
                        <div className="font-bold mb-1.5">Étapes</div>
                        <ol className="list-decimal pl-[18px] m-0 flex flex-col gap-1.5">
                            {(() => {
                                const steps = route.steps || []
                                const cumEnds: number[] = []
                                let run = 0
                                for (let i = 0; i < steps.length; i++) { run += Math.max(0, Number(steps[i]?.distance || 0)); cumEnds.push(run) }
                                return steps.slice(0, 12).map((s, i) => (
                                    <li key={i} className="text-[13px] text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors" onClick={() => {
                                        try {
                                            const bbox = (s as any).bbox as [[number, number], [number, number]] | undefined
                                            if (bbox && Array.isArray(bbox[0]) && Array.isArray(bbox[1])) {
                                                window.dispatchEvent(new CustomEvent('nav:focus-step-bounds', { detail: bbox }))
                                            } else if (s && s.coords && Array.isArray(s.coords) && s.coords.length === 2) {
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
