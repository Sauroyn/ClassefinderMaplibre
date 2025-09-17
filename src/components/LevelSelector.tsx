type Props = {
    level: number
    levels: number[]
    loading: boolean
    onChange: (n: number) => void
}

export default function LevelSelector({ level, levels, loading, onChange }: Props) {
    return (
        <div style={{ position: 'absolute', zIndex: 10, left: 10, top: 10, background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px', color: 'white' }}>
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
