import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore.js'

interface BillingStatus {
  plan: 'FREE' | 'PRO'
  subscription: { status: string; currentPeriodEnd: string } | null
}

async function fetchBillingStatus(userId: string): Promise<BillingStatus> {
  const res = await fetch(`/api/billing/status?userId=${userId}`)
  if (!res.ok) throw new Error('Plan bilgisi alınamadı')
  return res.json() as Promise<BillingStatus>
}

async function startCheckout(userId: string): Promise<string> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error('Ödeme başlatılamadı')
  const data = await res.json() as { url: string }
  return data.url
}

async function openPortal(userId: string): Promise<string> {
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error('Portal açılamadı')
  const data = await res.json() as { url: string }
  return data.url
}

export function Pricing() {
  const user = useAppStore((s) => s.user)!

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing-status', user.id],
    queryFn: () => fetchBillingStatus(user.id),
  })

  const checkout = useMutation({
    mutationFn: () => startCheckout(user.id),
    onSuccess: (url) => { window.location.href = url },
  })

  const portal = useMutation({
    mutationFn: () => openPortal(user.id),
    onSuccess: (url) => { window.location.href = url },
  })

  const isPro = billing?.plan === 'PRO'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600">← Geri</Link>
        <h1 className="text-xl font-bold text-gray-900">Plan & Fatura</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center text-gray-400">Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className={`bg-white rounded-2xl border-2 p-8 ${!isPro ? 'border-brand-500' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Ücretsiz</h2>
                {!isPro && <span className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded-full font-medium">Mevcut Plan</span>}
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-6">₺0<span className="text-base font-normal text-gray-400">/ay</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-8">
                <li>✓ Aylık 5 toplantı</li>
                <li>✓ Transkript + özet</li>
                <li>✓ Slack & Notion entegrasyonu</li>
                <li className="text-gray-300">✗ Öncelikli destek</li>
                <li className="text-gray-300">✗ Sınırsız toplantı</li>
              </ul>
              <div className="h-10" />
            </div>

            {/* Pro */}
            <div className={`bg-white rounded-2xl border-2 p-8 ${isPro ? 'border-brand-500' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Pro</h2>
                {isPro && <span className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded-full font-medium">Mevcut Plan</span>}
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-6">₺299<span className="text-base font-normal text-gray-400">/ay</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-8">
                <li>✓ Sınırsız toplantı</li>
                <li>✓ Transkript + özet</li>
                <li>✓ Slack & Notion entegrasyonu</li>
                <li>✓ Öncelikli destek</li>
                <li>✓ E-posta bildirimleri</li>
              </ul>
              {isPro ? (
                <button
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                  className="w-full py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  {portal.isPending ? 'Açılıyor...' : 'Faturayı Yönet'}
                </button>
              ) : (
                <button
                  onClick={() => checkout.mutate()}
                  disabled={checkout.isPending}
                  className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {checkout.isPending ? 'Yönlendiriliyor...' : "Pro'ya Geç"}
                </button>
              )}
              {(checkout.isError || portal.isError) && (
                <p className="mt-2 text-xs text-red-500 text-center">
                  {((checkout.error ?? portal.error) as Error).message}
                </p>
              )}
            </div>
          </div>
        )}

        {isPro && billing?.subscription && (
          <p className="text-center text-sm text-gray-400 mt-6">
            Dönem sonu: {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString('tr-TR')}
          </p>
        )}
      </main>
    </div>
  )
}
