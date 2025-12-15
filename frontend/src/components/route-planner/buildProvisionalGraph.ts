import { findByNormalizedId } from '../../utils/featureId'
import { createProvisionalNode } from '../../map/provisionalNode'

/**
 * Build a working graph including provisional nodes/edges when start or end refer to a provisional feature.
 * Returns the new graph (or original), whether provisional nodes were used, and the map of provisional nodes.
 */
export function buildProvisionalGraph(params: {
    graph: any,
    startId: string,
    endId: string,
    data?: GeoJSON.FeatureCollection | null,
    nodeOptions: Array<any>
}): { workingGraph: any, hasProvisional: boolean, provisionalNodes: Map<string, any> } {
    const { graph, startId, endId, data, nodeOptions } = params
    let workingGraph = graph
    let hasProvisional = false
    const newProvisionalNodes = new Map<string, any>()

    if (startId.startsWith('PROVISIONAL_') || endId.startsWith('PROVISIONAL_')) {
        workingGraph = { ...graph, nodes: [...graph.nodes], edges: [...graph.edges] }

        const edgesToRemove: Array<{ from: string; to: string }> = []
        const provisionalsList: any[] = []

        // First pass: create all provisional nodes and collect info
        for (const id of [startId, endId]) {
            if (!id.startsWith('PROVISIONAL_')) continue

            const opt = nodeOptions.find((n: any) => n.id === id) as any
            if (!opt || !opt.featureIndex || !data) continue

            const feature = findByNormalizedId(data, opt.featureIndex)
            if (!feature) continue

            const allFeatures = data.features as any[]
            const provisional = createProvisionalNode(feature, graph, id, allFeatures)
            if (!provisional) continue

            provisionalsList.push(provisional)

            // Collect edges to remove if intermediate node was created
            if (provisional.intermediateNode && provisional.edgeToRemove) {
                const splitEdge = provisional.connectionEdges.find((e: any) => e.id && e.id.includes('-split-1') && !e.id.includes('-reverse'))
                if (splitEdge) {
                    const fromNodeId = splitEdge.from
                    const toNodeId = provisional.connectionEdges.find((e: any) => e.id && e.id.includes('-split-2') && !e.id.includes('-reverse'))?.to
                    if (toNodeId) edgesToRemove.push({ from: String(fromNodeId), to: String(toNodeId) })
                }
            }

            newProvisionalNodes.set(id, provisional)
            hasProvisional = true
        }

        // Second pass: remove original edges that were split
        if (edgesToRemove.length > 0) {
            workingGraph.edges = workingGraph.edges.filter((e: any) => !edgesToRemove.some(toRemove =>
                (String(e.from) === toRemove.from && String(e.to) === toRemove.to) ||
                (String(e.from) === toRemove.to && String(e.to) === toRemove.from)
            ))
        }

        // Third pass: add all new nodes and edges
        for (const provisional of provisionalsList) {
            workingGraph.nodes.push(provisional.node)
            if (provisional.intermediateNode) workingGraph.nodes.push(provisional.intermediateNode)
            for (const edge of provisional.connectionEdges) workingGraph.edges.push(edge)
        }
    }

    return { workingGraph, hasProvisional, provisionalNodes: newProvisionalNodes }
}
