export default function RouteOption({ route, primary, highlighted, onHover, onLeave, onGo }: any) {
    const minutes = Math.round((route.time || 0) / 60)
    const meters = Math.round(route.distance || 0)
    const color = primary ? '#007bff' : (route.index === 1 ? '#999999' : '#cccccc')

    const bgClass = highlighted
        ? 'bg-gray-700 dark:bg-gray-600'
        : (primary ? 'bg-gray-800 dark:bg-gray-700' : 'bg-gray-900 dark:bg-gray-800')

    const borderClass = highlighted
        ? 'border-gray-600 dark:border-gray-500'
        : (primary ? 'border-gray-700 dark:border-gray-600' : 'border-gray-800 dark:border-gray-700')

    return (
        <div
            onMouseEnter={() => onHover(route)}
            onMouseLeave={() => onLeave(route)}
            onClick={() => onGo(route)}
            className={`flex justify-between items-center px-2 py-1.5 rounded-md cursor-pointer border ${bgClass} ${borderClass} hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors`}
        >
            <div>
                <div className="font-bold text-gray-900 dark:text-gray-100">{primary ? 'Plus court' : `Alternative ${route.index}`}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{meters} m • {minutes} min</div>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: color, opacity: primary ? 1 : 0.6 }} />
                <button
                    className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                    onClick={(e) => { e.stopPropagation(); onGo(route) }}
                >
                    Voir
                </button>
            </div>
        </div>
    )
}
