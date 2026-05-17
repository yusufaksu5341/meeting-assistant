import type { Task } from '../types.js'

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
}

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
}

interface Props {
  tasks: Task[]
}

export function TaskList({ tasks }: Props) {
  if (tasks.length === 0) {
    return <p className="text-gray-400 text-sm">Görev tespit edilmedi.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-3">
          <span className="mt-0.5 text-gray-300 text-lg">{task.done ? '✅' : '⬜'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 text-sm">{task.content}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500">👤 {task.assignee}</span>
              {task.deadline && (
                <span className="text-xs text-gray-400">📅 {task.deadline}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority] ?? ''}`}>
                {PRIORITY_LABEL[task.priority] ?? task.priority}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
