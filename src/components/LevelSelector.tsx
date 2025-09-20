type Props = {
    level: number
    levels: number[]
    loading: boolean
    onChange: (n: number) => void
}

export default function LevelSelector({ level, levels, loading, onChange }: Props) {
    // helpers to change level by index
    const changeByIndex = (dir: number) => {
        if (!levels || levels.length === 0) return
        const idx = levels.indexOf(level)
        if (idx === -1) return
        const next = Math.min(levels.length - 1, Math.max(0, idx + dir))
        if (next !== idx) onChange(levels[next])
    }

    // touch handling for mobile swipe
    let touchStartY: number | null = null
    const onTouchStart = (e: React.TouchEvent) => { touchStartY = e.touches[0]?.clientY ?? null }
    const onTouchMove = (e: React.TouchEvent) => { /* prevent scroll bubbling */ e.stopPropagation() }
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY === null) return
        const endY = e.changedTouches[0]?.clientY ?? touchStartY
        const dy = endY - touchStartY
        const threshold = 30
        if (Math.abs(dy) >= threshold) {
            // swipe up -> go to higher level (smaller index), swipe down -> lower level (bigger index)
            changeByIndex(dy > 0 ? 1 : -1)
        }
        touchStartY = null
    }

    const onWheel = (e: React.WheelEvent) => {
        // normalize: deltaY > 0 means scroll down -> next (lower) level
        if (!e.deltaY) return
        e.preventDefault()
        changeByIndex(e.deltaY > 0 ? 1 : -1)
    }

    return (
        <div
            style={{ position: 'absolute', zIndex: 10, right: 10, top: 10, background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px', color: 'white' }}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <label htmlFor="level-select">Niveau : </label>
            <select id="level-select" value={level} onChange={e => onChange(Number(e.target.value))} disabled={loading || levels.length === 0}>
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
