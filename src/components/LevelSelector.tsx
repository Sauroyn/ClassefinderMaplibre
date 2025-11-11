type Props = {
    level: number
    levels: number[]
    loading: boolean
    onChange: (n: number) => void
}

import React, { useEffect, useRef, useState } from 'react'

export default function LevelSelector({ level, levels, loading, onChange }: Props) {
    // Keep latest values in refs for stable event handlers
    const levelRef = useRef(level)
    const levelsRef = useRef(levels)
    const onChangeRef = useRef(onChange)
    useEffect(() => { levelRef.current = level }, [level])
    useEffect(() => { levelsRef.current = levels }, [levels])
    useEffect(() => { onChangeRef.current = onChange }, [onChange])
    // helpers to change level by index using refs
    const changeByIndex = (dir: number) => {
        const lvls = levelsRef.current
        if (!lvls || lvls.length === 0) return
        const idx = lvls.indexOf(levelRef.current)
        if (idx === -1) return
        const next = Math.min(lvls.length - 1, Math.max(0, idx + dir))
        if (next !== idx) onChangeRef.current(lvls[next])
    }

    // touch handling for mobile swipe (persist between renders)
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

    // Install a non-passive wheel listener once; use refs for latest values
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handler = (ev: WheelEvent) => {
            if (!ev.deltaY) return
            try { ev.preventDefault() } catch { }
            changeByIndex(ev.deltaY > 0 ? 1 : -1)
        }
        try { el.addEventListener('wheel', handler, { passive: false }) } catch { el.addEventListener('wheel', handler as any) }
        return () => { try { el.removeEventListener('wheel', handler as any) } catch { } }
    }, [])

    // dynamic mobile positioning: compute top so the selector sits below searchbar or route-planner
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [mobileTop, setMobileTop] = useState<number | null>(null)

    useEffect(() => {
        const update = () => {
            if (typeof window === 'undefined') return
            if (window.innerWidth > 720) {
                setMobileTop(null)
                return
            }
            const search = document.querySelector('.searchbar') as HTMLElement | null
            const planner = document.querySelector('.route-planner') as HTMLElement | null
            const navBanner = document.querySelector('.nav-banner') as HTMLElement | null
            let bottom = 10
            const consider = (el: HTMLElement | null) => {
                if (!el) return
                try {
                    const r = el.getBoundingClientRect()
                    // ignore if the element has no box
                    if (r.height <= 0 || r.width <= 0) return
                    const vv = (window as any).visualViewport
                    const offsetTop = vv && typeof vv.offsetTop === 'number' ? vv.offsetTop : 0
                    const bottomInLayout = r.bottom + offsetTop
                    if (bottomInLayout > bottom) bottom = bottomInLayout
                } catch (e) { }
            }
            consider(search)
            consider(planner)
            consider(navBanner)
            // add margin below the element
            setMobileTop(Math.ceil(bottom + 14))
        }
        update()
        const ro = new MutationObserver(update)
        ro.observe(document.body, { childList: true, subtree: true })
        window.addEventListener('resize', update)
        window.addEventListener('orientationchange', update)
        try {
            const vv = (window as any).visualViewport
            if (vv && vv.addEventListener) {
                vv.addEventListener('resize', update)
                vv.addEventListener('scroll', update)
            }
        } catch (e) { }
        return () => { ro.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update) }
    }, [levels, loading])

    const baseClasses = "absolute z-10 right-[10px] top-[10px] bg-black/50 dark:bg-black/60 backdrop-blur-sm p-2 rounded-lg text-white border border-transparent shadow-lg"
    const mobileClasses = "fixed right-[10px] z-[29] bg-black/50 dark:bg-black/60 backdrop-blur-sm p-2 rounded-lg text-white max-w-[420px] w-[calc(100%-40px)] border border-transparent shadow-lg"

    return (
        <div
            ref={containerRef}
            className={`level-selector ${mobileTop != null ? mobileClasses : baseClasses}`}
            style={mobileTop != null ? { top: mobileTop } : undefined}
            // wheel handled via non-passive listener above
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
                className="bg-black/40 dark:bg-black/50 text-white border border-white/20 rounded-md px-2 py-1 ml-2 outline-none focus:ring-2 focus:ring-blue-500"
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
