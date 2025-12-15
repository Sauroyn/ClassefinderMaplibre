type Props = {
    level: number
    levels: number[]
    loading: boolean
    onChange: (n: number) => void
}

import React, { useEffect, useRef } from 'react'

/**
 * Desktop-only level selector positioned at top-right of map.
 * Mobile version is handled by MobileControlsBar component.
 */
export default function LevelSelector({ level, levels, loading, onChange }: Props) {
    // Keep latest values in refs for stable event handlers
    const levelRef = useRef(level)
    const levelsRef = useRef(levels)
    const onChangeRef = useRef(onChange)
    useEffect(() => { levelRef.current = level }, [level])
    useEffect(() => { levelsRef.current = levels }, [levels])
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    // Helper to change level by index using refs
    const changeByIndex = (dir: number) => {
        const lvls = levelsRef.current
        if (!lvls || lvls.length === 0) return
        const idx = lvls.indexOf(levelRef.current)
        if (idx === -1) return
        const next = Math.min(lvls.length - 1, Math.max(0, idx + dir))
        if (next !== idx) onChangeRef.current(lvls[next])
    }

    // Touch handling for desktop swipe
    const touchStartY = useRef<number | null>(null)
    const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0]?.clientY ?? null }
    const onTouchMove = (e: React.TouchEvent) => { e.stopPropagation() }
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

    // Install a non-passive wheel listener; use refs for latest values
    const containerRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        const el = containerRef.current
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

    return (
        <div
            ref={containerRef}
            className="level-selector hidden md:block absolute z-10 right-[10px] top-[10px] bg-black/50 dark:bg-black/60 backdrop-blur-sm p-2 rounded-lg text-white border border-transparent shadow-lg"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <label htmlFor="level-select" className="text-sm font-medium">Niveau : </label>
            <select
                id="level-select"
                value={level}
                onChange={e => onChange(Number(e.target.value))}
                disabled={loading || levels.length === 0}
                className="bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 ml-2 outline-none focus:ring-2 focus:ring-blue-500"
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
    )
}
