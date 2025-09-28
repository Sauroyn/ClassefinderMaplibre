type Props = {
    level: number
    levels: number[]
    loading: boolean
    onChange: (n: number) => void
}

import React, { useEffect, useRef, useState } from 'react'

export default function LevelSelector({ level, levels, loading, onChange }: Props) {
    // helpers to change level by index
    const changeByIndex = (dir: number) => {
        if (!levels || levels.length === 0) return
        const idx = levels.indexOf(level)
        if (idx === -1) return
        const next = Math.min(levels.length - 1, Math.max(0, idx + dir))
        if (next !== idx) onChange(levels[next])
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

    // Install a non-passive wheel listener on the container to allow preventDefault without warning
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handler = (ev: WheelEvent) => {
            if (!ev.deltaY) return
            ev.preventDefault()
            changeByIndex(ev.deltaY > 0 ? 1 : -1)
        }
        try { el.addEventListener('wheel', handler, { passive: false }) } catch { el.addEventListener('wheel', handler as any) }
        return () => { try { el.removeEventListener('wheel', handler as any) } catch { } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, levels])

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

    const baseStyle: React.CSSProperties = { position: 'absolute', zIndex: 10, right: 10, top: 10, background: 'var(--panel-bg, rgba(0,0,0,0.5))', padding: '8px', borderRadius: '8px', color: 'var(--panel-fg, white)', border: '1px solid var(--panel-border, transparent)', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }
    const mobileStyle: React.CSSProperties = mobileTop != null ? { position: 'fixed', right: 10, top: mobileTop, zIndex: 29, background: 'var(--panel-bg, rgba(0,0,0,0.5))', padding: '8px', borderRadius: 8, color: 'var(--panel-fg, white)', maxWidth: 420, width: 'calc(100% - 40px)', border: '1px solid var(--panel-border, transparent)', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' } : baseStyle

    return (
        <div
            ref={containerRef}
            className="level-selector"
            style={mobileTop != null ? mobileStyle : baseStyle}
            // wheel handled via non-passive listener above
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <label htmlFor="level-select">Niveau : </label>
            <select id="level-select" value={level} onChange={e => onChange(Number(e.target.value))} disabled={loading || levels.length === 0} style={{ background: 'var(--panel-bg, rgba(0,0,0,0.5))', color: 'var(--panel-fg, white)', border: '1px solid var(--panel-border, transparent)', borderRadius: 6 }}>
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
