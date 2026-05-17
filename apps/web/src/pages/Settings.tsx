import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { IntegrationStatus } from '../components/IntegrationStatus.js'

interface IntegrationStatusData {
  slack: boolean
  notion: boolean
}

async function fetchStatus(userId: string): Promise<IntegrationStatusData> {
  const res = await fetch(`/api/integrations/status?userId=${userId}`)
  if (!res.ok) throw new Error('Durum alınamadı')
  return res.json() as Promise<IntegrationStatusData>
}

async function disconnectIntegration(provider: string, userId: string): Promise<void> {
  const res = await fetch(`/api/integrations/${provider}?userId=${userId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Bağlantı kesilemedi')
}

export function Settings() {
  const user = useAppStore((s) => s.user)!
  const setUser = useAppStore((s) => s.setUser)
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const { data: status, isLoading } = useQuery({
    queryKey: ['integration-status', user.id],
    queryFn: () => fetchStatus(user.id),
  })

  const disconnect = useMutation({
    mutationFn: (provider: string) => disconnectIntegration(provider, user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-status', user.id] }),
  })

  // Slack / Notion bağlantı tamamlanınca yenile
  useEffect(() => {
    if (searchParams.get('slack') === 'connected' || searchParams.get('notion') === 'connected') {
      queryClient.invalidateQueries({ queryKey: ['integration-status', user.id] })
    }
  }, [searchParams, queryClient, user.id])

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${import.meta.env['VITE_SLACK_CLIENT_ID']}&scope=chat:write&user_scope=&state=${user.id}`
  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${import.meta.env['VITE_NOTION_CLIENT_ID']}&response_type=code&owner=user&state=${user.id}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-gray-400 hover:text-gray-600">← Geri</Link>
        <h1 className="text-xl font-bold text-gray-900">Ayarlar</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Hesap</h2>
          <p className="text-sm text-gray-500 mb-4">{user.email}</p>
          <button
            onClick={() => setUser(null)}
            className="text-sm text-red-500 hover:underline"
          >
            Çıkış Yap
          </button>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Entegrasyonlar</h2>
          {isLoading ? (
            <p className="text-gray-400 text-sm">Yükleniyor...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <IntegrationStatus
                name="Slack"
                icon="💬"
                connected={status?.slack ?? false}
                connectUrl={slackAuthUrl}
                onDisconnect={() => disconnect.mutate('slack')}
              />
              <IntegrationStatus
                name="Notion"
                icon="📓"
                connected={status?.notion ?? false}
                connectUrl={notionAuthUrl}
                onDisconnect={() => disconnect.mutate('notion')}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
