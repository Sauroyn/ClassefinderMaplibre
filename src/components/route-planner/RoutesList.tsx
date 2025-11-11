import RouteOption from './RouteOption'

type Props = {
    routes: any[]
    highlightedRoute: string | null
    onHover: (rt: any) => void
    onLeave: (rt: any) => void
    onGo: (rt: any) => void
}

export default function RoutesList({ routes, highlightedRoute, onHover, onLeave, onGo }: Props) {
    if (!routes || routes.length === 0) return null
    return (
        <div className="flex gap-2 flex-col">
            {routes.map((r: any, i: number) => (
                <RouteOption
                    key={r.id}
                    route={{ ...r, index: i }}
                    primary={i === 0}
                    highlighted={highlightedRoute === r.layerId}
                    onHover={onHover}
                    onLeave={onLeave}
                    onGo={onGo}
                />
            ))}
        </div>
    )
}
