import { useEffect, useRef } from 'react'
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
    minPeekPx?: number,
    apiRef?: { current: null | { snapTo: (index: number) => void, snapToMin: () => void } }
}) {
    const sortedPercents = useRef<number[]>([])
    const snapsPxRef = useRef<number[]>([])
    const sheetRef = useRef<any>(null)

    useEffect(() => {
        const clamped = (snapPercents || [0.05, 0.2, 0.5, 0.9])
            .map((p) => Math.max(0.02, Math.min(0.98, p)))
            .sort((a, b) => a - b)
        sortedPercents.current = clamped
    }, [snapPercents])

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
        maxHeight = typeof maxHeight === 'number' && isFinite(maxHeight) ? maxHeight : 600
        minHeight = typeof minHeight === 'number' && isFinite(minHeight) ? minHeight : Math.max(56, Math.round(maxHeight * 0.12))
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
        const peek = Math.max(1, Math.min(maxHeight, Math.round(minPeekPx)))
        const snaps = Array.from(new Set([peek, ...percBase].map(v => Math.max(peek, Math.min(maxHeight, v))))).sort((a, b) => a - b)
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
                try {
                    const snaps = snapsPxRef.current
                    if (Array.isArray(snaps) && snaps.length) {
                        requestAnimationFrame(() => sheetRef.current?.snapTo?.(snaps[0]))
                    }
                } catch { /* no-op */ }
                const _respectOutside = !!reduceOnOutsideClick
                void _respectOutside
            }}
            header={header ? (
                <div style={{ fontWeight: 700, color: 'var(--rsbs-color, #111)' }}>
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
