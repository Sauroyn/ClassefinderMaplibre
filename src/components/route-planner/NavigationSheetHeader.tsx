
export function NavigationSheetHeader({ totalDist, totalTime, isDark, onOpenSettings, onFinish }: { totalDist: string, totalTime: string, isDark: boolean, onOpenSettings?: () => void, onFinish: () => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <div style={{ fontWeight: 700 }}>Trajet en cours</div>
                <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{totalDist} • {totalTime}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button aria-label="Paramètres" title="Paramètres" onClick={onOpenSettings}
                    style={{ border: '1px solid ' + (isDark ? '#333' : '#e3e3e3'), background: 'transparent', color: 'inherit', borderRadius: 8, padding: '4px 8px' }}>⚙</button>
                <button onClick={onFinish} style={{ border: 'none', background: '#e74c3c', color: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}>Finir</button>
            </div>
        </div>
    )
}
