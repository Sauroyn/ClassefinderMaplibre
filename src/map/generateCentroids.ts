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
        // Mode par défaut : un centroïde par feature
        // Mais on marque le PREMIER centroïde de chaque bâtiment comme "primary"
        const seenBuildings = new Set<string>()

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

            // Enrichir les properties avec l'alias si disponible
            const featureId = normalizedFeatureId(f, i)
            const alias = getAlias(featureId)
            const enrichedProperties = { ...f.properties }

            if (alias) {
                // Remplacer le nom par l'alias
                enrichedProperties.name = alias.aliasName
                // Conserver le nom original dans une propriété séparée
                enrichedProperties._originalName = f.properties?.name || ''
            }

            // Marquer le premier centroïde de chaque bâtiment comme "primary"
            const buildingId = enrichedProperties.__buildingId || 'default'
            const isPrimary = !seenBuildings.has(buildingId)
            if (isPrimary) {
                seenBuildings.add(buildingId)
            }
            enrichedProperties.__isPrimaryCentroid = isPrimary

            centroids.features.push({
                type: 'Feature',
                id: f.id,
                properties: enrichedProperties,
                geometry: { type: 'Point', coordinates: centroid }
            })
        }
        return centroids
    }

    // Mode par bâtiment : un seul centroïde par __buildingId
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
