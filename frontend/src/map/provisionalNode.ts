import { haversine } from './measure'
import { lineIntersectsFeature, pointInFeature } from './geometry'
import type { Graph } from '../components/route-planner/utils'

/**
 * Calculate the centroid of a GeoJSON feature (Polygon or MultiPolygon)
 */
export function calculateFeatureCentroid(feature: any): [number, number] | null {
    if (!feature || !feature.geometry) return null

    const geom = feature.geometry
    if (geom.type === 'Polygon') {
        const ring = geom.coordinates[0]
        if (!ring || ring.length === 0) return null

        let sumX = 0, sumY = 0
        const count = ring.length - 1 // Last point is duplicate of first
        for (let i = 0; i < count; i++) {
            sumX += ring[i][0]
            sumY += ring[i][1]
        }
        return [sumX / count, sumY / count]
    }

    if (geom.type === 'MultiPolygon') {
        // Find the largest polygon by area
        let bestRing: number[][] | null = null
        let bestArea = 0

        for (const poly of geom.coordinates) {
            const ring = poly[0]
            let area = 0
            for (let i = 0; i < ring.length - 1; i++) {
                const x0 = ring[i][0], y0 = ring[i][1]
                const x1 = ring[i + 1][0], y1 = ring[i + 1][1]
                area += (x0 * y1 - x1 * y0)
            }
            area = Math.abs(area) / 2
            if (area > bestArea) {
                bestArea = area
                bestRing = ring
            }
        }

        if (!bestRing || bestRing.length === 0) return null

        let sumX = 0, sumY = 0
        const count = bestRing.length - 1
        for (let i = 0; i < count; i++) {
            sumX += bestRing[i][0]
            sumY += bestRing[i][1]
        }
        return [sumX / count, sumY / count]
    }

    return null
}

/**
 * Extract level from feature properties
 */
export function extractFeatureLevel(feature: any): number | string | null {
    if (!feature || !feature.properties) return null

    const props = feature.properties
    if (props.level != null) {
        const n = Number(props.level)
        return Number.isFinite(n) ? n : props.level
    }

    // If levels array, take the first one
    if (Array.isArray(props.levels) && props.levels.length > 0) {
        const n = Number(props.levels[0])
        return Number.isFinite(n) ? n : props.levels[0]
    }

    return null
}

/**
 * Find the closest point on a line segment to a given coordinate
 * Returns the closest point and the distance
 */
function closestPointOnSegment(
    coord: [number, number],
    segmentStart: [number, number],
    segmentEnd: [number, number]
): { point: [number, number]; distance: number } {
    const [x, y] = coord
    const [x1, y1] = segmentStart
    const [x2, y2] = segmentEnd

    const dx = x2 - x1
    const dy = y2 - y1

    if (dx === 0 && dy === 0) {
        // Segment is a point
        return { point: segmentStart, distance: haversine(coord, segmentStart) }
    }

    // Calculate parameter t that represents position along the segment
    let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    t = Math.max(0, Math.min(1, t))

    const closestX = x1 + t * dx
    const closestY = y1 + t * dy
    const closestPoint: [number, number] = [closestX, closestY]

    return {
        point: closestPoint,
        distance: haversine(coord, closestPoint)
    }
}

/**
 * Find the closest point on any edge in the graph with the same level
 * Returns the edge, the closest point on it, the distance, and whether we need a new node
 * 
 * Constraints:
 * - Do NOT connect to nodes that have a name (risk of going through walls)
 * - Prefer edges where the connection line doesn't cross other features
 */
export function findClosestPointOnGraph(
    graph: Graph,
    coord: [number, number],
    targetLevel: number | string | null,
    sourceFeature?: any,  // The feature we're connecting from
    allFeatures?: any[]   // All features to check for intersections
): {
    edgeId: string;
    closestPoint: [number, number];
    distance: number;
    fromNodeId: string;
    toNodeId: string;
    needsNewNode: boolean;
    splitRatio: number; // 0-1, position along edge
    edge: any; // The original edge object
} | null {
    if (!graph || !graph.edges || graph.edges.length === 0) return null

    const nodeById = new Map(graph.nodes.map((n: any) => [String(n.id), n]))
    let bestResult: any = null
    let bestDistance = Infinity

    for (const edge of graph.edges) {
        const fromNode = nodeById.get(String(edge.from))
        const toNode = nodeById.get(String(edge.to))

        if (!fromNode || !toNode) continue
        if (!Array.isArray(fromNode.coord) || !Array.isArray(toNode.coord)) continue

        // Check level matching
        const edgeLevel = edge.raw?.properties?.level ?? fromNode.level ?? toNode.level
        const levelsMatch = targetLevel == null || edgeLevel == null ||
            String(edgeLevel) === String(targetLevel)

        if (!levelsMatch) continue

        const result = closestPointOnSegment(
            coord,
            fromNode.coord as [number, number],
            toNode.coord as [number, number]
        )

        if (result.distance < bestDistance) {
            const [x1, y1] = fromNode.coord as [number, number]
            const [x2, y2] = toNode.coord as [number, number]
            const dx = x2 - x1
            const dy = y2 - y1
            const segmentLength = Math.sqrt(dx * dx + dy * dy)

            const dxToPoint = result.point[0] - x1
            const dyToPoint = result.point[1] - y1
            const distToPoint = Math.sqrt(dxToPoint * dxToPoint + dyToPoint * dyToPoint)
            const splitRatio = segmentLength > 0 ? distToPoint / segmentLength : 0

            // If the closest point is very close to an existing node (< 0.5m), use that node
            const distToFrom = haversine(result.point, fromNode.coord as [number, number])
            const distToTo = haversine(result.point, toNode.coord as [number, number])
            const threshold = 0.5 // meters

            // Check if nodes have names (for constraint checking)
            const fromHasName = fromNode.name && typeof fromNode.name === 'string' && fromNode.name.trim().length > 0
            const toHasName = toNode.name && typeof toNode.name === 'string' && toNode.name.trim().length > 0

            // CONSTRAINT 2: Check if connection line crosses other features
            let crossesOtherFeatures = false
            if (allFeatures && sourceFeature) {
                const connectionLine: [number, number] = coord
                const targetPoint: [number, number] = result.point

                for (const feat of allFeatures) {
                    // Skip the source feature itself
                    if (feat === sourceFeature) continue

                    // Skip features on different levels
                    const featLevel = feat.properties?.level ??
                        (Array.isArray(feat.properties?.levels) && feat.properties.levels.length > 0
                            ? feat.properties.levels[0]
                            : null)

                    if (featLevel != null && targetLevel != null && String(featLevel) !== String(targetLevel)) {
                        continue
                    }

                    // Check if the connection line intersects this feature
                    if (lineIntersectsFeature(connectionLine, targetPoint, feat)) {
                        // Additional check: if the target point is inside this feature, it's OK
                        // (we might be connecting to an adjacent corridor)
                        if (!pointInFeature(targetPoint, feat)) {
                            crossesOtherFeatures = true
                            break
                        }
                    }
                }
            }

            // Skip this edge if it crosses other features
            if (crossesOtherFeatures) continue

            // CONSTRAINT 1: If the closest point is on a named node, skip it (risk of wall crossing)
            if (distToFrom < threshold && fromHasName) continue
            if (distToTo < threshold && toHasName) continue

            bestDistance = result.distance
            bestResult = {
                edgeId: String(edge.id),
                closestPoint: result.point,
                distance: result.distance,
                fromNodeId: String(edge.from),
                toNodeId: String(edge.to),
                needsNewNode: distToFrom > threshold && distToTo > threshold,
                splitRatio,
                edge
            }
        }
    }

    return bestResult
}

/**
 * Find the closest node in the graph with the same level
 * Returns the node id and distance, or null if no matching node found
 */
export function findClosestNodeWithLevel(
    graph: Graph,
    coord: [number, number],
    targetLevel: number | string | null
): { nodeId: string; distance: number } | null {
    if (!graph || !graph.nodes || graph.nodes.length === 0) return null

    let bestNodeId: string | null = null
    let bestDistance = Infinity

    for (const node of graph.nodes) {
        // Check if node has matching level
        const nodeLevel = node.level != null ? node.level : (
            Array.isArray(node.levels) && node.levels.length > 0 ? node.levels[0] : null
        )

        // Try to match level (handle string/number comparison)
        const levelsMatch = targetLevel == null || nodeLevel == null ||
            String(nodeLevel) === String(targetLevel)

        if (!levelsMatch) continue

        if (!Array.isArray(node.coord) || node.coord.length < 2) continue

        const dist = haversine(coord, node.coord as [number, number])
        if (dist < bestDistance) {
            bestDistance = dist
            bestNodeId = String(node.id)
        }
    }

    if (bestNodeId === null) return null
    return { nodeId: bestNodeId, distance: bestDistance }
}

/**
 * Create a provisional node for a feature that exists but has no corresponding graph node
 */
export function createProvisionalNode(
    feature: any,
    graph: Graph,
    provisionalId: string,
    allFeatures?: any[]  // All features to check for intersections
): {
    node: any;
    connectionEdges: any[];
    level: number | string | null;
    intermediateNode?: any; // Node created on edge if needed
    edgeToRemove?: string; // ID of the original edge to remove if split
} | null {
    // Calculate centroid
    const centroid = calculateFeatureCentroid(feature)
    if (!centroid) return null

    // Extract level
    const level = extractFeatureLevel(feature)

    // Find closest point on graph (edge or node), passing feature and all features for intersection check
    const closest = findClosestPointOnGraph(graph, centroid, level, feature, allFeatures)
    if (!closest) return null

    // Create provisional node at feature centroid
    const node = {
        id: provisionalId,
        coord: centroid,
        name: feature.properties?.name ?? provisionalId,
        level,
        provisional: true
    }

    const edges: any[] = []
    let intermediateNode: any = undefined

    if (closest.needsNewNode) {
        // Create an intermediate node on the edge
        const intermediateId = `${provisionalId}-intermediate`
        intermediateNode = {
            id: intermediateId,
            coord: closest.closestPoint,
            name: intermediateId,
            level,
            provisional: true,
            intermediate: true
        }

        // Edge from provisional to intermediate
        edges.push({
            id: `${provisionalId}-to-intermediate`,
            from: provisionalId,
            to: intermediateId,
            weight: closest.distance,
            tags: ['provisional'],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [centroid, closest.closestPoint] },
                properties: { level: level != null ? level : undefined }
            }
        })

        // Reverse edge
        edges.push({
            id: `${provisionalId}-to-intermediate-reverse`,
            from: intermediateId,
            to: provisionalId,
            weight: closest.distance,
            tags: ['provisional'],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [closest.closestPoint, centroid] },
                properties: { level: level != null ? level : undefined }
            }
        })

        // Split the original edge: from -> intermediate
        const fromNode = graph.nodes.find((n: any) => String(n.id) === closest.fromNodeId)
        const distFromToIntermediate = fromNode ? haversine(fromNode.coord as [number, number], closest.closestPoint) : 0

        edges.push({
            id: `${closest.edgeId}-split-1`,
            from: closest.fromNodeId,
            to: intermediateId,
            weight: distFromToIntermediate,
            tags: closest.edge?.tags || [],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [fromNode?.coord, closest.closestPoint] },
                properties: { level: level != null ? level : undefined, ...closest.edge?.raw?.properties }
            }
        })

        edges.push({
            id: `${closest.edgeId}-split-1-reverse`,
            from: intermediateId,
            to: closest.fromNodeId,
            weight: distFromToIntermediate,
            tags: closest.edge?.tags || [],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [closest.closestPoint, fromNode?.coord] },
                properties: { level: level != null ? level : undefined, ...closest.edge?.raw?.properties }
            }
        })

        // Split the original edge: intermediate -> to
        const toNode = graph.nodes.find((n: any) => String(n.id) === closest.toNodeId)
        const distIntermediateToTo = toNode ? haversine(closest.closestPoint, toNode.coord as [number, number]) : 0

        edges.push({
            id: `${closest.edgeId}-split-2`,
            from: intermediateId,
            to: closest.toNodeId,
            weight: distIntermediateToTo,
            tags: closest.edge?.tags || [],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [closest.closestPoint, toNode?.coord] },
                properties: { level: level != null ? level : undefined, ...closest.edge?.raw?.properties }
            }
        })

        edges.push({
            id: `${closest.edgeId}-split-2-reverse`,
            from: closest.toNodeId,
            to: intermediateId,
            weight: distIntermediateToTo,
            tags: closest.edge?.tags || [],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [toNode?.coord, closest.closestPoint] },
                properties: { level: level != null ? level : undefined, ...closest.edge?.raw?.properties }
            }
        })
    } else {
        // Closest point is very close to an existing node, connect directly
        const targetNodeId = haversine(closest.closestPoint,
            graph.nodes.find((n: any) => String(n.id) === closest.fromNodeId)?.coord as [number, number]) <
            haversine(closest.closestPoint,
                graph.nodes.find((n: any) => String(n.id) === closest.toNodeId)?.coord as [number, number])
            ? closest.fromNodeId : closest.toNodeId

        edges.push({
            id: `${provisionalId}-connector`,
            from: provisionalId,
            to: targetNodeId,
            weight: closest.distance,
            tags: ['provisional'],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [centroid, closest.closestPoint] },
                properties: { level: level != null ? level : undefined }
            }
        })

        edges.push({
            id: `${provisionalId}-connector-reverse`,
            from: targetNodeId,
            to: provisionalId,
            weight: closest.distance,
            tags: ['provisional'],
            provisional: true,
            raw: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [closest.closestPoint, centroid] },
                properties: { level: level != null ? level : undefined }
            }
        })
    }

    return {
        node,
        connectionEdges: edges,
        level,
        intermediateNode,
        edgeToRemove: closest.needsNewNode ? closest.edgeId : undefined
    }
}
