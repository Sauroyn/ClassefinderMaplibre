import { Xmark, LocationArrow, MapPin } from '@gravity-ui/icons'

type NodeOption = { id: string, name: string }

type Props = {
    startQuery: string
    endQuery: string
    setStartQuery: (v: string) => void
    setEndQuery: (v: string) => void
    onPickStart: (id: string, name: string) => void
    onPickEnd: (id: string, name: string) => void
    onClearStart: () => void
    onClearEnd: () => void
    nodeOptions: NodeOption[]
    setFocusedField: (f: 'start' | 'end' | null) => void
}

export default function Inputs({ startQuery, endQuery, setStartQuery, setEndQuery, onPickStart, onPickEnd, onClearStart, onClearEnd, nodeOptions, setFocusedField }: Props) {
    const tryPickSingle = (query: string, pick: (id: string, name: string) => void) => {
        const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((query || '').toLowerCase()))
        if (list.length === 1) { const n = list[0]; pick(n.id, n.name || String(n.id)); setFocusedField(null) }
    }
    return (
        <div className="relative flex-1 min-w-0">
            {/* Barre de recherche départ avec icône de position */}
            <div className="flex gap-2 items-start">
                <div className="flex flex-col items-center pt-2 gap-1">
                    <LocationArrow className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div className="w-0.5 h-4 border-l-2 border-dashed border-gray-400 dark:border-gray-500" />
                    <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center min-h-[40px]">
                        <input
                            value={startQuery}
                            onChange={(e) => { setStartQuery(e.target.value); setFocusedField('start') }}
                            onFocus={() => setFocusedField('start')}
                            onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); tryPickSingle(startQuery, onPickStart) } }}
                            className="flex-1 p-2 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Rechercher un départ..."
                        />
                        {startQuery ? (
                            <button
                                onClick={onClearStart}
                                title="Clear start"
                                className="p-1.5 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                            >
                                <Xmark className="w-4 h-4" />
                            </button>
                        ) : <div className="w-9" />}
                    </div>

                    {/* Trait horizontal de séparation */}
                    <div className="h-px bg-gray-200 dark:bg-gray-700" />

                    <div className="flex items-center min-h-[40px]">
                        <input
                            value={endQuery}
                            onChange={(e) => { setEndQuery(e.target.value); setFocusedField('end') }}
                            onFocus={() => setFocusedField('end')}
                            onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); tryPickSingle(endQuery, onPickEnd) } }}
                            className="flex-1 p-2 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Rechercher une arrivée..."
                        />
                        {endQuery ? (
                            <button
                                onClick={onClearEnd}
                                title="Clear end"
                                className="p-1.5 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                            >
                                <Xmark className="w-4 h-4" />
                            </button>
                        ) : <div className="w-9" />}
                    </div>
                </div>
            </div>
        </div>
    )
}
