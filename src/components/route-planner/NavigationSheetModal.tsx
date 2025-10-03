import { Sheet } from 'react-modal-sheet'
import { useRef } from 'react'
import type { SheetRef } from 'react-modal-sheet'
import type { RouteStep } from './RouteStepsGenerator'

type Props = {
    isOpen: boolean
    steps: RouteStep[]
    currentStepIndex: number
    etaMinutes: number | null
    remainingDistance: number | null
    onStop: () => void
}

export default function NavigationSheetModal({ isOpen, steps, currentStepIndex, etaMinutes, remainingDistance, onStop }: Props) {
    const sheetRef = useRef<SheetRef | null>(null)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    if (!isMobile) return null

    const next = steps[currentStepIndex + 1] || steps[currentStepIndex] || null

    return (
        <Sheet
            ref={sheetRef as any}
            isOpen={isOpen}
            onClose={() => { if (sheetRef.current) try { sheetRef.current.snapTo(2) } catch { } }}
            snapPoints={[0, 0.15, 0.4, 0.9, 1]}
            initialSnap={2}
            onSnap={(index) => { if (index === 0) { try { sheetRef.current?.snapTo(1) } catch { } } }}
        >
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content style={{ background: 'var(--panel-bg, #fff)' }}>
                    <div style={{ padding: '12px 16px' }}>
                        {/* Header: next instruction */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, color: 'var(--text-muted, #666)' }}>Prochaine étape</div>
                                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--panel-fg, #111)' }}>
                                    {next ? next.instruction : 'Arrivée proche'}
                                </div>
                            </div>
                            <button onClick={onStop} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#ff3b30', color: '#fff', fontWeight: 600 }}>Terminer</button>
                        </div>

                        {/* KPIs */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                            <div style={{ padding: '8px 12px', border: '1px solid var(--panel-border, #eee)', borderRadius: 8 }}>
                                ⏱ ETA: {etaMinutes != null ? `${etaMinutes} min` : '—'}
                            </div>
                            <div style={{ padding: '8px 12px', border: '1px solid var(--panel-border, #eee)', borderRadius: 8 }}>
                                📏 Restant: {remainingDistance != null ? `${Math.round(remainingDistance)} m` : '—'}
                            </div>
                        </div>

                        {/* Steps list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '45vh', overflow: 'auto' }}>
                            {steps.map((s, i) => (
                                <div key={i} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--panel-border, #eee)', background: i === currentStepIndex + 1 ? 'rgba(0,122,255,0.08)' : 'var(--panel-bg, #fff)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--panel-fg, #111)' }}>{s.instruction}</div>
                                    {s.distance && <div style={{ color: 'var(--text-muted, #666)', fontSize: 13 }}>{Math.round(s.distance)} m</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </Sheet.Content>
            </Sheet.Container>
        </Sheet>
    )
}
