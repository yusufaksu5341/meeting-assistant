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

async function fetchPlan(userId: string): Promise<{ plan: 'FREE' | 'PRO' }> {
  const res = await fetch(`/api/billing/status?userId=${userId}`)
  if (!res.ok) return { plan: 'FREE' }
  return res.json() as Promise<{ plan: 'FREE' | 'PRO' }>
}

export function Dashboard() {
  const user = useAppStore((s) => s.user)!

  const { data: meetings = [], isLoading, refetch } = useQuery({
    queryKey: ['meetings', user.id],
    queryFn: () => fetchMeetings(user.id),
  })

  const { data: billing } = useQuery({
    queryKey: ['billing-status', user.id],
    queryFn: () => fetchPlan(user.id),
  })

  const FREE_LIMIT = 5
  const isNearLimit = billing?.plan === 'FREE' && meetings.length >= FREE_LIMIT - 1

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
        {isNearLimit && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              ⚠️ Ücretsiz planda <strong>{FREE_LIMIT} toplantı</strong> limitine yaklaştınız.
            </p>
            <Link to="/pricing" className="text-sm font-medium text-amber-700 hover:underline shrink-0 ml-4">
              Pro'ya Geç →
            </Link>
          </div>
        )}

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
