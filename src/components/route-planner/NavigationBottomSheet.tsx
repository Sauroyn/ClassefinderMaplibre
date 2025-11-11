import type { NavigationState } from './NavigationController'
import { BottomSheetBase } from './BottomSheetBase'
import { formatDistance, formatEta } from './MobileSheetsUtils'
import { NavigationSheetHeader } from './NavigationSheetHeader'
import { NavigationStepsList } from './NavigationStepsList'


export default function NavigationBottomSheet({ nav, onFinish, onOpenSettings }: { nav: NavigationState, onFinish: () => void, onOpenSettings?: () => void }) {
    if (!nav.active || !nav.route) return null
    const route = nav.route as any
    const steps: Array<any> = Array.isArray(route.steps) ? route.steps : []
    const totalDist = formatDistance(Math.round(route.distance || 0))
    const totalTime = formatEta(Math.round(route.time || 0))
    const apiRef = { current: null as null | { snapTo: (index: number) => void, snapToMin: () => void } }

    return (
        <BottomSheetBase
            open={true}
            reduceOnOutsideClick={false}
            apiRef={apiRef}
            header={<NavigationSheetHeader totalDist={totalDist} totalTime={totalTime} onOpenSettings={() => {
                try { window.dispatchEvent(new CustomEvent('ui:open-settings')) } catch { }
                if (onOpenSettings) onOpenSettings()
            }} onFinish={onFinish} />}
            initialSnap={0.2}
            snapPercents={[0.12, 0.28, 0.5, 0.86]}
        >
            <div className="text-sm">
                <div className="font-bold mb-1.5">Étapes</div>
                <NavigationStepsList steps={steps} nav={nav} route={route} apiRef={apiRef} />
            </div>
        </BottomSheetBase>
    )
}
