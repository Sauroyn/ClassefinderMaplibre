import { Sheet } from 'react-modal-sheet'
import { generateRouteSteps, getDirectionIcon, type RouteStep } from './RouteStepsGenerator'
import { useEffect, useRef, useState } from 'react'
import type { SheetRef } from 'react-modal-sheet'
import { focusPoint } from '../../map/viewportDynamic'

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
    onClose: () => void
    route: Route | null
    graph: any
    onStartNavigation: () => void
    onSaveRoute: (route: Route, name: string) => void
    mapRef?: any
}

export default function RouteDetailModal({
    isOpen,
    onClose,
    route,
    graph,
    onStartNavigation,
    onSaveRoute,
    mapRef
}: Props) {
    const sheetRef = useRef<SheetRef | null>(null)
    const [steps, setSteps] = useState<RouteStep[]>([])
    const [routeName, setRouteName] = useState('')
    const [showSaveDialog, setShowSaveDialog] = useState(false)

    // Détection mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    console.log('[RouteDetailModal] isOpen:', isOpen, 'isMobile:', isMobile, 'route:', route?.id)

    useEffect(() => {
        if (route && graph) {
            const generatedSteps = generateRouteSteps(graph, route.path)
            setSteps(generatedSteps)
        } else {
            setSteps([])
        }
    }, [route, graph])

    console.log('[RouteDetailModal] About to check conditions - isOpen:', isOpen, 'isMobile:', isMobile, 'route:', route?.id)

    if (!isMobile) {
        console.log('[RouteDetailModal] Not mobile, returning null')
        return null
    }

    if (!route) {
        console.log('[RouteDetailModal] No route, returning null')
        return null
    }

    console.log('[RouteDetailModal] All conditions passed, rendering modal')

    const handleSaveRoute = () => {
        if (routeName.trim() && route) {
            onSaveRoute(route, routeName.trim())
            setShowSaveDialog(false)
            setRouteName('')
        }
    }

    const routeTitle = route.index === 0 ? 'Plus court' : `Alternative ${route.index}`

    return (
        <Sheet
            ref={sheetRef as any}
            isOpen={isOpen}
            onClose={() => {
                // empêcher la fermeture: revenir au snap principal
                if (sheetRef.current) {
                    try { sheetRef.current.snapTo(1) } catch { }
                }
            }}
            onSnap={(index) => {
                if (index === 0 && sheetRef.current) {
                    try { sheetRef.current.snapTo(1) } catch { }
                }
            }}
            snapPoints={[0, 0.08, 0.3, 0.65, 0.95, 1]}
            initialSnap={3}
            style={{ zIndex: 1100 }}
        >
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content>
                    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* En-tête */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <button
                                    onClick={() => {
                                        // Aller à la liste des itinéraires plutôt que fermer
                                        try { if (sheetRef.current) sheetRef.current.snapTo(0) } catch { }
                                        // Laisser RoutePlanner rouvrir la liste selon son état
                                        onClose()
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                >
                                    ←
                                </button>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '20px',
                                    fontWeight: 600,
                                    color: 'var(--panel-fg, #111)'
                                }}>
                                    {routeTitle}
                                </h2>
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '16px',
                                fontSize: '14px',
                                color: 'var(--text-muted, #666)'
                            }}>
                                <span>📏 {Math.round(route.distance)} m</span>
                                <span>⏱️ {Math.round(route.time / 60)} min</span>
                            </div>

                            {/* Boutons d'action */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={onStartNavigation}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        borderRadius: '24px',
                                        border: 'none',
                                        background: 'var(--primary-color, #007AFF)',
                                        color: 'white',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    🚀 Démarrer
                                </button>

                                <button
                                    onClick={() => setShowSaveDialog(true)}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '24px',
                                        border: '1px solid var(--panel-border, #e0e0e0)',
                                        background: 'var(--panel-bg, white)',
                                        color: 'var(--panel-fg, #111)',
                                        fontSize: '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    💾
                                </button>
                            </div>
                        </div>

                        {/* Liste des étapes */}
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                margin: '0 0 16px 0',
                                color: 'var(--panel-fg, #111)'
                            }}>
                                Étapes de l'itinéraire
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {steps.map((step, index) => (
                                    <div
                                        key={step.id}
                                        onClick={() => {
                                            try {
                                                const map = mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current))
                                                const coords = step.coordinates?.[0]
                                                if (map && coords) focusPoint(map, coords as [number, number], { zoom: 18 })
                                            } catch { }
                                        }}
                                        style={{
                                            display: 'flex',
                                            gap: '12px',
                                            padding: '16px',
                                            borderRadius: '12px',
                                            background: index === 0 || step.id === 'end' ?
                                                'var(--primary-bg-light, #f0f8ff)' :
                                                'var(--panel-bg-alt, #f8f9fa)',
                                            border: '1px solid var(--panel-border, #e0e0e0)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            fontSize: '20px',
                                            minWidth: '24px',
                                            textAlign: 'center'
                                        }}>
                                            {step.id === 'start' ? '🏁' :
                                                step.id === 'end' ? '🎯' :
                                                    getDirectionIcon(step.direction)}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontWeight: 600,
                                                fontSize: '16px',
                                                color: 'var(--panel-fg, #111)',
                                                marginBottom: '4px'
                                            }}>
                                                {step.instruction}
                                            </div>

                                            {step.distance > 0 && (
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: 'var(--text-muted, #666)'
                                                }}>
                                                    {step.distance} m
                                                    {step.level !== undefined && ` • Niveau ${step.level}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dialog de sauvegarde */}
                        {showSaveDialog && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000,
                                padding: '20px'
                            }}>
                                <div style={{
                                    background: 'var(--panel-bg, white)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    width: '100%',
                                    maxWidth: '400px'
                                }}>
                                    <h3 style={{
                                        margin: '0 0 16px 0',
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        color: 'var(--panel-fg, #111)'
                                    }}>
                                        Sauvegarder l'itinéraire
                                    </h3>

                                    <input
                                        type="text"
                                        value={routeName}
                                        onChange={(e) => setRouteName(e.target.value)}
                                        placeholder="Nom de l'itinéraire"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--panel-border, #e0e0e0)',
                                            fontSize: '16px',
                                            marginBottom: '20px',
                                            boxSizing: 'border-box'
                                        }}
                                    />

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={() => setShowSaveDialog(false)}
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--panel-border, #e0e0e0)',
                                                background: 'var(--panel-bg, white)',
                                                color: 'var(--panel-fg, #111)',
                                                fontSize: '16px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Annuler
                                        </button>

                                        <button
                                            onClick={handleSaveRoute}
                                            disabled={!routeName.trim()}
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: routeName.trim() ?
                                                    'var(--primary-color, #007AFF)' :
                                                    'var(--disabled-bg, #ccc)',
                                                color: 'white',
                                                fontSize: '16px',
                                                cursor: routeName.trim() ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Sauvegarder
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Sheet.Content>
            </Sheet.Container>
            {/* Pas de backdrop pour conserver l'interaction derrière */}
        </Sheet>
    )
}