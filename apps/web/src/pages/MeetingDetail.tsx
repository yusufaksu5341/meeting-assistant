import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { TaskList } from '../components/TaskList.js'
import type { MeetingWithTasks } from '../types.js'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '⏳ Bekliyor',
  JOINING: '🔗 Katılıyor',
  RECORDING: '🔴 Kaydediyor',
  PROCESSING: '⚙️ İşleniyor',
  DONE: '✅ Tamamlandı',
  FAILED: '❌ Başarısız',
}

async function fetchMeeting(id: string): Promise<MeetingWithTasks> {
  const res = await fetch(`/api/meetings/${id}`)
  if (!res.ok) throw new Error('Toplantı bulunamadı')
  return res.json() as Promise<MeetingWithTasks>
}

export function MeetingDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => fetchMeeting(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && ['DONE', 'FAILED'].includes(status) ? false : 5000
    },
  })

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Yükleniyor...</div>
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">
        Toplantı yüklenemedi.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-gray-400 hover:text-gray-600">← Geri</Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{meeting.title ?? 'Toplantı'}</h1>
        <span className="text-sm text-gray-500">{STATUS_LABEL[meeting.status] ?? meeting.status}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {meeting.summary && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-3">📝 Özet</h2>
            <p className="text-gray-600 whitespace-pre-line">{meeting.summary}</p>
          </section>
        )}

        {meeting.decisions && meeting.decisions.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-3">🗳️ Alınan Kararlar</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {meeting.decisions.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </section>
        )}

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">✅ Görevler</h2>
          <TaskList tasks={meeting.tasks} />
        </section>

        {meeting.transcript && (
          <details className="bg-white rounded-xl border border-gray-200 p-6">
            <summary className="font-semibold text-gray-800 cursor-pointer">📄 Transkript</summary>
            <pre className="mt-4 text-xs text-gray-500 whitespace-pre-wrap overflow-auto max-h-96">
              {meeting.transcript}
            </pre>
          </details>
        )}
      </main>
    </div>
  )
}
