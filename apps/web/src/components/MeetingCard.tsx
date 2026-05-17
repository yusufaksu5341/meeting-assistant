import { Link } from 'react-router-dom'
import type { Meeting } from '../types.js'

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-gray-400',
  JOINING: 'bg-blue-400',
  RECORDING: 'bg-red-500 animate-pulse',
  PROCESSING: 'bg-yellow-400 animate-pulse',
  DONE: 'bg-green-500',
  FAILED: 'bg-red-600',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Bekliyor',
  JOINING: 'Katılıyor',
  RECORDING: 'Kaydediyor',
  PROCESSING: 'İşleniyor',
  DONE: 'Tamamlandı',
  FAILED: 'Başarısız',
}

const PLATFORM_ICON: Record<string, string> = {
  zoom: '🟦',
  meet: '🟩',
  teams: '🟪',
}

interface Props {
  meeting: Meeting
}

export function MeetingCard({ meeting }: Props) {
  const date = meeting.startedAt
    ? new Date(meeting.startedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date(meeting.createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-500 hover:shadow-sm transition flex items-start gap-4"
    >
      <span className="text-2xl mt-0.5">{PLATFORM_ICON[meeting.platform] ?? '📹'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{meeting.title ?? 'İşleniyor...'}</p>
        <p className="text-sm text-gray-400 mt-0.5">{date}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[meeting.status] ?? 'bg-gray-400'}`} />
        <span className="text-xs text-gray-500">{STATUS_LABEL[meeting.status] ?? meeting.status}</span>
      </div>
    </Link>
  )
}
