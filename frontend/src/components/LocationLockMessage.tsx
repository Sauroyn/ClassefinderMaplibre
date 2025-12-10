import { CircleExclamation, MapPin } from '@gravity-ui/icons'
import { useState } from 'react'
import type { LocationLockState } from '../hooks/useLocationLock'
import { useEffect } from 'react'
// no inline config selector; user can use Settings or bottom-right selector if available

type Props = {
    lockState: LocationLockState
}

/**
 * Display a modal message when user is blocked by location lock
 */
export default function LocationLockMessage({ lockState }: Props) {
    const [dismissed, setDismissed] = useState(false)
    // Reset dismissal when status changes
    useEffect(() => { setDismissed(false) }, [lockState.status])
    if (dismissed || lockState.status === 'idle' || lockState.status === 'requesting' || lockState.status === 'inside') {
        return null
    }

    let title = ''
    let message = ''
    let icon = <CircleExclamation />

    switch (lockState.status) {
        case 'denied':
            title = 'Localisation requise'
            message = 'Cette carte nécessite votre localisation pour afficher les données. Veuillez autoriser l\'accès à votre position et recharger la page.'
            break
        case 'outside':
            title = 'Hors zone autorisée'
            message = 'Vous êtes en dehors de la zone autorisée pour accéder aux données. Veuillez vous déplacer dans la zone bleue affichée sur la carte.'
            icon = <MapPin />
            break
        case 'error':
            title = 'Erreur de localisation'
            message = lockState.error || 'Impossible de récupérer votre position.'
            break
    }

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md mx-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        {icon}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            {message}
                        </p>
                        {/* Acknowledge and close the popup to interact with map */}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => setDismissed(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                            >
                                OK
                            </button>
                            {lockState.status === 'denied' && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md text-sm font-medium transition-colors"
                                >
                                    Recharger
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
