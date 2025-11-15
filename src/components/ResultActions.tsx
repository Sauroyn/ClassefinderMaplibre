import { Route, Pencil } from '@gravity-ui/icons'

type Props = {
    name: string
    level?: string | number
}

export default function ResultActions({ name }: Props) {
    return (
        <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="font-bold text-gray-900 dark:text-gray-100">{name}</div>
            <div className="mt-1.5 flex gap-2">
                <button className="px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5">
                    <Route className="w-4 h-4" />
                    <span>Itinéraire</span>
                </button>
                <button className="px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5">
                    <Pencil className="w-4 h-4" />
                    <span>Alias</span>
                </button>
            </div>
        </div>
    )
}
