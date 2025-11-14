import { Xmark } from '@gravity-ui/icons'

type Item = { id: string | number; name: string; level?: string | number }

function dispatchHover(id?: string | number) {
  try {
    if (id === undefined || id === null) {
      window.dispatchEvent(new CustomEvent('map:hover-clear'))
    } else {
      window.dispatchEvent(new CustomEvent('map:hover-feature', { detail: id }))
    }
  } catch { }
}

export default function GroupedResultsMenu({ title, items, onPick, onClose }: { title: string; items: Item[]; onPick: (id: string | number, name: string) => void; onClose: () => void }) {
  return (
    <div className="absolute left-3 right-3 md:right-auto top-[60px] z-[45] w-[calc(100%-24px)] md:w-[360px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl">
      <div className="flex items-center justify-between p-2.5 border-b border-gray-200 dark:border-gray-700">
        <div className="font-extrabold">{title}</div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
        >
          <Xmark className="w-4 h-4" />
        </button>
      </div>
      <div onMouseLeave={() => dispatchHover(undefined)}>
        {items.map((it) => (
          <div
            key={`group-menu-${String(it.id)}`}
            onMouseEnter={() => dispatchHover(it.id)}
            onMouseLeave={() => dispatchHover(undefined)}
            onClick={() => { onPick(it.id, it.name); onClose() }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(it.id, it.name); onClose() } }}
            role="button"
            tabIndex={0}
            className="flex justify-between p-2.5 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex flex-col">
              <div className="font-bold">{it.name}</div>
              <div className="opacity-80 text-xs text-gray-600 dark:text-gray-400">Niv. {it.level != null ? String(it.level) : '—'}</div>
            </div>
            <div className="self-center opacity-90 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm">#{String(it.id)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
