import type { NavigationState } from './NavigationController'
import { BottomSheetBase, formatDistance, formatEta } from './MobileSheets'

export default function NavigationBottomSheet({ nav, onFinish }: { nav: NavigationState, onFinish: () => void }) {
  if (!nav.active || !nav.route) return null
  const route = nav.route as any
  const steps: Array<any> = Array.isArray(route.steps) ? route.steps : []
  const current = Math.max(0, Math.min(nav.currentStep || 0, steps.length - 1))
  const nextStep = steps[current] || null
  const totalDist = formatDistance(Math.round(route.distance || 0))
  const totalTime = formatEta(Math.round(route.time || 0))

  // Detect dark mode
  const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <BottomSheetBase
      open={true}
      header={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <div style={{ fontWeight: 700 }}>Trajet en cours</div>
          <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{totalDist} • {totalTime}</div>
        </div>
        <button onClick={onFinish} style={{ border: 'none', background: '#e74c3c', color: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}>Finir</button>
      </div>}
      initialSnap={0.2}
      snapPercents={[0.12, 0.28, 0.5, 0.86]}
    >
      <div style={{ fontSize: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Prochaine étape</div>
        {nextStep ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>• Avancez {formatDistance(Math.round(nextStep.distance || 0))}</div>
            {/* détails de géométrie ou instruction peuvent être ajoutés ici */}
          </div>
        ) : (
          <div>Aucune étape restante.</div>
        )}
      </div>
    </BottomSheetBase>
  )
}
