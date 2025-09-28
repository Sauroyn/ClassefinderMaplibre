import { kShortestPaths } from '../shortestPath'

export function preparePaths(graph: any, start: string, end: string, opts: { excludeStairs: boolean, coveredOnly?: boolean, k: number }) {
    const { excludeStairs, coveredOnly = false, k } = opts
    const exclude = excludeStairs ? ['stairs'] : []
    const filteredEdges = graph.edges.filter((e: any) => {
        const tags: string[] = Array.isArray(e.tags) ? e.tags : (e.tags ? [e.tags] : [])
        let isSteps = false
        if (tags.some(t => String(t).toLowerCase() === 'steps')) isSteps = true
        if (e.raw && e.raw.properties) {
            const hp = e.raw.properties['highway'] ?? e.raw.properties['type']
            if (hp && String(hp).toLowerCase() === 'steps') isSteps = true
        }
        if (excludeStairs && isSteps) return false
        if (coveredOnly) {
            let isCovered = false
            if (e.raw && e.raw.properties) {
                const cov = e.raw.properties['covered'] ?? e.raw.properties['isCovered']
                if (cov === true || String(cov).toLowerCase() === 'yes' || String(cov).toLowerCase() === 'true') isCovered = true
            }
            if (!isCovered) return false
        }
        return true
    })
    const ks = kShortestPaths({ nodes: graph.nodes, edges: filteredEdges }, String(start), String(end), k, exclude)
    return ks
}
