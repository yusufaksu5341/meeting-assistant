import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore.js'
import { MeetingCard } from '../components/MeetingCard.js'
import { BotLauncher } from '../components/BotLauncher.js'
import type { Meeting } from '../types.js'

async function fetchMeetings(userId: string): Promise<Meeting[]> {
  const res = await fetch(`/api/meetings?userId=${userId}`)
  if (!res.ok) throw new Error('Toplantılar yüklenemedi')
  return res.json() as Promise<Meeting[]>
}

export function Dashboard() {
  const user = useAppStore((s) => s.user)!

  const { data: meetings = [], isLoading, refetch } = useQuery({
    queryKey: ['meetings', user.id],
    queryFn: () => fetchMeetings(user.id),
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🤖 Toplantı Asistanı</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <Link to="/settings" className="text-sm text-brand-600 hover:underline">Ayarlar</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <BotLauncher userId={user.id} onSuccess={() => refetch()} />

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Geçmiş Toplantılar</h2>
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p>Henüz toplantı yok. Yukarıdan bir bot başlat!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {meetings.map((m) => <MeetingCard key={m.id} meeting={m} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
