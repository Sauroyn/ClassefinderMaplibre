import { Sheet } from 'react-modal-sheet'
import { useRef } from 'react'
import type { SheetRef } from 'react-modal-sheet'

type Route = {
    id: string
    layerId: string
    path: string[]
    cost: number
    distance: number
    time: number
    index?: number
}

type Props = {
    isOpen: boolean
    routes: Route[]
    highlightedRoute: string | null
    onSelectRoute: (route: Route) => void
}

export default function RouteSheetModal({
    isOpen,
    routes,
    highlightedRoute,
    onSelectRoute
}: Props) {
    const sheetRef = useRef<SheetRef | null>(null)
    // Détection mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    // Si ce n'est pas mobile, on n'affiche rien
    if (!isMobile) return null

    return (
        <Sheet
            ref={sheetRef as any}
            isOpen={isOpen}
            onClose={() => {
                // Empêcher la fermeture: rebondir au snap intermédiaire
                if (sheetRef.current) {
                    try { sheetRef.current.snapTo(2) } catch { }
                }
            }}
            snapPoints={[0, 0.4, 0.7, 1]} // Ajouter le 0 pour satisfaire react-modal-sheet
            initialSnap={2} // Index 2 = 0.7 (70%)
            onSnap={(index) => {
                // Ne rien faire sur snap 0 pour empêcher la fermeture
                if (index === 0) {
                    // Forcer un retour sur un snap ouvert si l'utilisateur essaie de fermer
                    if (sheetRef.current) {
                        try { sheetRef.current.snapTo(1) } catch { }
                    }
                }
            }}
        >
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content style={{ background: 'var(--panel-bg, white)' }}>
                    <div style={{ padding: '16px 20px', background: 'var(--panel-bg, white)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: 600,
                                color: 'var(--panel-fg, #111)'
                            }}>
                                Itinéraires disponibles
                            </h2>
                        </div>

                        {routes && routes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {routes.map((route: Route, index: number) => (
                                    <div
                                        key={route.id}
                                        onClick={() => onSelectRoute(route)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: highlightedRoute === route.layerId ?
                                                '2px solid var(--primary-color, #007AFF)' :
                                                '1px solid var(--panel-border, #e0e0e0)',
                                            background: highlightedRoute === route.layerId ?
                                                'var(--primary-bg-light, #f0f8ff)' :
                                                'var(--panel-bg, white)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: 600,
                                                    fontSize: '16px',
                                                    color: 'var(--panel-fg, #111)',
                                                    marginBottom: '4px'
                                                }}>
                                                    {index === 0 ? 'Plus court' : `Alternative ${index}`}
                                                </div>
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: 'var(--text-muted, #666)',
                                                    display: 'flex',
                                                    gap: '12px'
                                                }}>
                                                    <span>📏 {Math.round(route.distance)} m</span>
                                                    <span>⏱️ {Math.round(route.time / 60)} min</span>
                                                </div>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}>
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    background: index === 0 ? '#ff0000' : (index === 1 ? '#999999' : '#cccccc'),
                                                    opacity: index === 0 ? 1 : 0.7
                                                }} />
                                                <div style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    background: 'var(--primary-color, #007AFF)',
                                                    color: 'white',
                                                    fontSize: '14px',
                                                    fontWeight: 500
                                                }}>
                                                    Sélectionner
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: 'var(--text-muted, #666)'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
                                <div style={{ fontSize: '16px' }}>
                                    Aucun itinéraire trouvé
                                </div>
                            </div>
                        )}
                    </div>
                </Sheet.Content>
            </Sheet.Container>
            {/* Pas de Sheet.Backdrop pour permettre l'interaction avec le reste du site */}
        </Sheet>
    )
}