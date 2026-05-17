import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

type Platform = 'zoom' | 'meet' | 'teams'

function detectPlatform(url: string): Platform {
  if (url.includes('zoom.us')) return 'zoom'
  if (url.includes('meet.google')) return 'meet'
  if (url.includes('teams.microsoft') || url.includes('teams.live')) return 'teams'
  return 'zoom'
}

async function startBot(payload: { meetingUrl: string; platform: Platform; userId: string }) {
  const res = await fetch('/api/meetings/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json() as { error?: string }
    throw new Error(err.error ?? 'Bot başlatılamadı')
  }
  return res.json()
}

interface Props {
  userId: string
  onSuccess: () => void
}

export function BotLauncher({ userId, onSuccess }: Props) {
  const [url, setUrl] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      startBot({ meetingUrl: url, platform: detectPlatform(url), userId }),
    onSuccess: () => {
      setUrl('')
      onSuccess()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    mutation.mutate()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Toplantıya Bot Gönder</h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Zoom / Meet / Teams toplantı linki..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={mutation.isPending}
          required
        />
        <button
          type="submit"
          disabled={mutation.isPending || !url.trim()}
          className="bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {mutation.isPending ? 'Gönderiliyor...' : 'Botu Gönder'}
        </button>
      </form>
      {mutation.isError && (
        <p className="mt-2 text-sm text-red-500">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && (
        <p className="mt-2 text-sm text-green-600">✅ Bot toplantıya katılıyor!</p>
      )}
    </div>
  )
}
