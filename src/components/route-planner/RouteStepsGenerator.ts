type RouteStep = {
    id: string
    instruction: string
    distance: number
    direction: 'straight' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'slight-left' | 'slight-right' | 'u-turn'
    coordinates: [number, number][]
    level?: number
}

export function generateRouteSteps(graph: any, routePath: string[]): RouteStep[] {
    if (!graph || !routePath || routePath.length < 2) return []

    const nodeById = new Map<string, any>()
    for (const n of graph.nodes) {
        nodeById.set(String(n.id), n)
    }

    const steps: RouteStep[] = []

    // Premier point : départ
    const startNode = nodeById.get(String(routePath[0]))
    if (startNode) {
        steps.push({
            id: 'start',
            instruction: 'Départ',
            distance: 0,
            direction: 'straight',
            coordinates: [startNode.coord],
            level: startNode.level
        })
    }

    // Analyse des segments intermédiaires
    for (let i = 1; i < routePath.length - 1; i++) {
        const prevNodeId = String(routePath[i - 1])
        const currentNodeId = String(routePath[i])
        const nextNodeId = String(routePath[i + 1])

        const prevNode = nodeById.get(prevNodeId)
        const currentNode = nodeById.get(currentNodeId)
        const nextNode = nodeById.get(nextNodeId)

        if (!prevNode || !currentNode || !nextNode) continue

        // Calcul de l'angle entre les segments
        const bearing1 = calculateBearing(prevNode.coord, currentNode.coord)
        const bearing2 = calculateBearing(currentNode.coord, nextNode.coord)
        const angleDiff = normalizeBearing(bearing2 - bearing1)

        // Calcul de la distance du segment précédent
        const distance = haversineDistance(prevNode.coord, currentNode.coord)

        // Détermination de la direction
        let direction: RouteStep['direction'] = 'straight'
        let instruction = 'Continuer tout droit'

        if (Math.abs(angleDiff) > 15) {
            if (angleDiff > 150 || angleDiff < -150) {
                direction = 'u-turn'
                instruction = 'Faire demi-tour'
            } else if (angleDiff > 45) {
                direction = angleDiff > 135 ? 'sharp-left' : 'left'
                instruction = angleDiff > 135 ? 'Tourner fortement à gauche' : 'Tourner à gauche'
            } else if (angleDiff < -45) {
                direction = angleDiff < -135 ? 'sharp-right' : 'right'
                instruction = angleDiff < -135 ? 'Tourner fortement à droite' : 'Tourner à droite'
            } else if (angleDiff > 15) {
                direction = 'slight-left'
                instruction = 'Tourner légèrement à gauche'
            } else if (angleDiff < -15) {
                direction = 'slight-right'
                instruction = 'Tourner légèrement à droite'
            }
        }

        // Ajouter des informations sur le niveau si disponible
        if (currentNode.level !== undefined && prevNode.level !== undefined && currentNode.level !== prevNode.level) {
            const levelDiff = currentNode.level - prevNode.level
            if (levelDiff > 0) {
                instruction += ` (monter au niveau ${currentNode.level})`
            } else {
                instruction += ` (descendre au niveau ${currentNode.level})`
            }
        }

        steps.push({
            id: currentNodeId,
            instruction,
            distance: Math.round(distance),
            direction,
            coordinates: [currentNode.coord],
            level: currentNode.level
        })
    }

    // Dernière étape : arrivée
    if (routePath.length > 1) {
        const lastNodeId = String(routePath[routePath.length - 1])
        const secondLastNodeId = String(routePath[routePath.length - 2])
        const lastNode = nodeById.get(lastNodeId)
        const secondLastNode = nodeById.get(secondLastNodeId)

        if (lastNode && secondLastNode) {
            const finalDistance = haversineDistance(secondLastNode.coord, lastNode.coord)
            steps.push({
                id: 'end',
                instruction: 'Arrivée à destination',
                distance: Math.round(finalDistance),
                direction: 'straight',
                coordinates: [lastNode.coord],
                level: lastNode.level
            })
        }
    }

    return steps
}

// Utilitaires pour les calculs géographiques
function calculateBearing(from: [number, number], to: [number, number]): number {
    const dLon = (to[0] - from[0]) * Math.PI / 180
    const lat1 = from[1] * Math.PI / 180
    const lat2 = to[1] * Math.PI / 180

    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function normalizeBearing(bearing: number): number {
    while (bearing > 180) bearing -= 360
    while (bearing < -180) bearing += 360
    return bearing
}

function haversineDistance(from: [number, number], to: [number, number]): number {
    const R = 6371000 // rayon de la Terre en mètres
    const dLat = (to[1] - from[1]) * Math.PI / 180
    const dLon = (to[0] - from[0]) * Math.PI / 180
    const lat1 = from[1] * Math.PI / 180
    const lat2 = to[1] * Math.PI / 180

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}

export function getDirectionIcon(direction: RouteStep['direction']): string {
    switch (direction) {
        case 'straight': return '⬆️'
        case 'left': return '⬅️'
        case 'right': return '➡️'
        case 'sharp-left': return '↖️'
        case 'sharp-right': return '↗️'
        case 'slight-left': return '↰'
        case 'slight-right': return '↱'
        case 'u-turn': return '↩️'
        default: return '⬆️'
    }
}

export type { RouteStep }