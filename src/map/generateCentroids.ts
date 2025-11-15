import { polygonCentroid } from './centroids'
import { getAlias } from '../utils/aliases'
import { normalizedFeatureId } from '../utils/featureId'

/**
 * Génère des centroïdes pour les features GeoJSON.
 * 
 * @param data - Collection de features
 * @param perBuilding - Si true, génère un seul centroïde par bâtiment (basé sur __buildingId)
 *                       Si false, génère un centroïde par feature individuelle
 * @returns FeatureCollection de points représentant les centroïdes
 */
export function generateCentroids(data: any, perBuilding: boolean = false) {
    const centroids: any = { type: 'FeatureCollection', features: [] }
    if (!data || !data.features) return centroids

    if (!perBuilding) {
        // Mode par défaut : un centroïde par feature + un centroïde spécial par bâtiment
        // Stratégie : créer un centroïde supplémentaire au centre de chaque bâtiment
        // pour afficher le nom du bâtiment, et conserver tous les centroïdes de features
        // à leur position d'origine pour afficher les noms individuels

        // Étape 1 : Grouper par bâtiment et calculer les centres moyens
        const buildingCenters = new Map<string, [number, number]>()
        const buildingLabels = new Map<string, string>()
        const buildingCentroids = new Map<string, Array<{ coords: [number, number], feature: any, index: number }>>()

        for (let i = 0; i < data.features.length; i++) {
            const f = data.features[i]
            if (!f.geometry) continue

            let centroid: [number, number] | null = null
            if (f.geometry.type === 'Polygon') centroid = polygonCentroid(f.geometry.coordinates[0])
            else if (f.geometry.type === 'MultiPolygon') {
                let best: { area: number, centroid: [number, number] } | null = null
                for (const poly of f.geometry.coordinates) {
                    const ring = poly[0]
                    let a = 0
                    for (let j = 0, len = ring.length - 1; j < len; j++) {
                        const x0 = ring[j][0], y0 = ring[j][1]
                        const x1 = ring[j + 1][0], y1 = ring[j + 1][1]
                        a += (x0 * y1 - x1 * y0)
                    }
                    a = Math.abs(a) / 2
                    const c = polygonCentroid(ring)
                    if (!best || a > best.area) best = { area: a, centroid: c }
                }
                if (best) centroid = best.centroid
            }
            if (!centroid) continue

            const buildingId = f.properties?.__buildingId || 'default'
            const buildingLabel = f.properties?.__buildingLabel || buildingId

            if (!buildingCentroids.has(buildingId)) {
                buildingCentroids.set(buildingId, [])
                buildingLabels.set(buildingId, buildingLabel)
            }
            buildingCentroids.get(buildingId)!.push({ coords: centroid, feature: f, index: i })
        }

        // Calculer le centre moyen de chaque bâtiment
        for (const [buildingId, items] of buildingCentroids.entries()) {
            const avgLon = items.reduce((sum, item) => sum + item.coords[0], 0) / items.length
            const avgLat = items.reduce((sum, item) => sum + item.coords[1], 0) / items.length
            buildingCenters.set(buildingId, [avgLon, avgLat])
        }

        // Étape 2 : Créer un centroïde spécial par bâtiment (pour le nom du bâtiment)
        for (const [buildingId, buildingCenter] of buildingCenters.entries()) {
            centroids.features.push({
                type: 'Feature',
                // ID spécial pour éviter les conflits
                id: `building-center-${buildingId}`,
                properties: {
                    __buildingId: buildingId,
                    __buildingLabel: buildingLabels.get(buildingId),
                    __isPrimaryCentroid: true,
                    __isBuildingCentroid: true,
                    // Pas de propriété 'name' pour ne pas être affiché en zoom élevé
                },
                geometry: { type: 'Point', coordinates: buildingCenter }
            })
        }

        // Étape 3 : Générer les centroïdes de features (pour les noms individuels)
        for (const items of buildingCentroids.values()) {
            for (const { coords, feature, index } of items) {
                // Enrichir les properties avec l'alias si disponible
                const featureId = normalizedFeatureId(feature, index)
                const alias = getAlias(featureId)
                const enrichedProperties = { ...feature.properties }

                if (alias) {
                    enrichedProperties.name = alias.aliasName
                    enrichedProperties._originalName = feature.properties?.name || ''
                }

                // Ces centroïdes ne sont PAS primaires (pour ne pas être affichés en bas zoom)
                enrichedProperties.__isPrimaryCentroid = false
                enrichedProperties.__isBuildingCentroid = false

                centroids.features.push({
                    type: 'Feature',
                    id: feature.id,
                    properties: enrichedProperties,
                    geometry: { type: 'Point', coordinates: coords }
                })
            }
        }
        return centroids
    }    // Mode par bâtiment : un seul centroïde par __buildingId
    const buildingGroups = new Map<string, any[]>()

    // Grouper les features par bâtiment
    for (const feature of data.features) {
        const buildingId = feature.properties?.__buildingId || 'default'
        if (!buildingGroups.has(buildingId)) {
            buildingGroups.set(buildingId, [])
        }
        buildingGroups.get(buildingId)!.push(feature)
    }

    // Pour chaque bâtiment, calculer le centroïde moyen de toutes ses features
    for (const [buildingId, features] of buildingGroups.entries()) {
        const coords: [number, number][] = []

        // Extraire tous les centroïdes des features de ce bâtiment
        for (const feature of features) {
            const geom = feature.geometry
            if (!geom) continue
            let coord: [number, number] | null = null

            if (geom.type === 'Polygon') {
                coord = polygonCentroid(geom.coordinates[0])
            } else if (geom.type === 'MultiPolygon') {
                let best: { area: number, centroid: [number, number] } | null = null
                for (const poly of geom.coordinates) {
                    const ring = poly[0]
                    let a = 0
                    for (let j = 0, len = ring.length - 1; j < len; j++) {
                        const x0 = ring[j][0], y0 = ring[j][1]
                        const x1 = ring[j + 1][0], y1 = ring[j + 1][1]
                        a += (x0 * y1 - x1 * y0)
                    }
                    a = Math.abs(a) / 2
                    const c = polygonCentroid(ring)
                    if (!best || a > best.area) best = { area: a, centroid: c }
                }
                if (best) coord = best.centroid
            }

            if (coord) coords.push(coord)
        }

        if (coords.length === 0) continue

        // Calculer le centroïde moyen du bâtiment
        const avgLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
        const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length

        // Prendre les propriétés de la première feature (notamment __buildingLabel)
        const firstFeature = features[0]

        centroids.features.push({
            type: 'Feature',
            properties: {
                __buildingId: buildingId,
                __buildingLabel: firstFeature.properties?.__buildingLabel || buildingId,
                // On ne copie PAS les propriétés individuelles comme 'name', 'level', etc.
                // car ce centroïde représente le bâtiment entier, pas une feature spécifique
            },
            geometry: { type: 'Point', coordinates: [avgLon, avgLat] }
        })
    }

    return centroids
}
