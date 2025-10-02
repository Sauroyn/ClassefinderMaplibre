type SavedRoute = {
    id: string
    name: string
    path: string[]
    distance: number
    time: number
    savedAt: number
    startNodeName?: string
    endNodeName?: string
}

const SAVED_ROUTES_KEY = 'maplibre_saved_routes'

export function saveRoute(route: any, name: string, graph?: any): SavedRoute {
    const savedRoute: SavedRoute = {
        id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        path: route.path,
        distance: route.distance,
        time: route.time,
        savedAt: Date.now()
    }

    // Ajouter les noms des nœuds de départ et d'arrivée si possible
    if (graph && route.path && route.path.length > 0) {
        const nodeById = new Map<string, any>()
        for (const n of graph.nodes) {
            nodeById.set(String(n.id), n)
        }

        const startNode = nodeById.get(String(route.path[0]))
        const endNode = nodeById.get(String(route.path[route.path.length - 1]))

        if (startNode) savedRoute.startNodeName = startNode.name || String(startNode.id)
        if (endNode) savedRoute.endNodeName = endNode.name || String(endNode.id)
    }

    const existingRoutes = getSavedRoutes()
    const newRoutes = [...existingRoutes, savedRoute]

    try {
        localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(newRoutes))
    } catch (error) {
        console.warn('Erreur lors de la sauvegarde:', error)
        throw new Error('Impossible de sauvegarder l\'itinéraire')
    }

    return savedRoute
}

export function getSavedRoutes(): SavedRoute[] {
    try {
        const saved = localStorage.getItem(SAVED_ROUTES_KEY)
        if (!saved) return []

        const routes = JSON.parse(saved)
        return Array.isArray(routes) ? routes : []
    } catch (error) {
        console.warn('Erreur lors du chargement des itinéraires sauvegardés:', error)
        return []
    }
}

export function deleteSavedRoute(routeId: string): void {
    const existingRoutes = getSavedRoutes()
    const filteredRoutes = existingRoutes.filter(route => route.id !== routeId)

    try {
        localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(filteredRoutes))
    } catch (error) {
        console.warn('Erreur lors de la suppression:', error)
        throw new Error('Impossible de supprimer l\'itinéraire')
    }
}

export function loadSavedRoute(routeId: string): SavedRoute | null {
    const savedRoutes = getSavedRoutes()
    return savedRoutes.find(route => route.id === routeId) || null
}

export function clearAllSavedRoutes(): void {
    try {
        localStorage.removeItem(SAVED_ROUTES_KEY)
    } catch (error) {
        console.warn('Erreur lors de la suppression de tous les itinéraires:', error)
    }
}

export type { SavedRoute }