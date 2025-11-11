import { Xmark } from '@gravity-ui/icons'

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
            <div className="text-xs flex items-center gap-2"><div>Départ</div></div>
            <div className="flex gap-1.5 items-center mt-1.5">
                <input
                    value={startQuery}
                    onChange={(e) => { setStartQuery(e.target.value); setFocusedField('start') }}
                    onFocus={() => setFocusedField('start')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); tryPickSingle(startQuery, onPickStart) } }}
                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rechercher un départ..."
                />
                {startQuery ? (
                    <button
                        onClick={onClearStart}
                        title="Clear start"
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        <Xmark className="w-4 h-4" />
                    </button>
                ) : null}
            </div>
            <div className="text-xs mt-2">Arrivée</div>
            <div className="flex gap-1.5 items-center mt-1.5">
                <input
                    value={endQuery}
                    onChange={(e) => { setEndQuery(e.target.value); setFocusedField('end') }}
                    onFocus={() => setFocusedField('end')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); tryPickSingle(endQuery, onPickEnd) } }}
                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rechercher une arrivée..."
                />
                {endQuery ? (
                    <button
                        onClick={onClearEnd}
                        title="Clear end"
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        <Xmark className="w-4 h-4" />
                    </button>
                ) : null}
            </div>
        </div>
    )
}
