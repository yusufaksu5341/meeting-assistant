interface Props {
  name: string
  icon: string
  connected: boolean
  connectUrl: string
  onDisconnect: () => void
}

export function IntegrationStatus({ name, icon, connected, connectUrl, onDisconnect }: Props) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-medium text-gray-800 text-sm">{name}</p>
          <p className={`text-xs ${connected ? 'text-green-600' : 'text-gray-400'}`}>
            {connected ? 'Bağlı' : 'Bağlı değil'}
          </p>
        </div>
      </div>
      {connected ? (
        <button
          onClick={onDisconnect}
          className="text-xs text-red-500 hover:underline"
        >
          Bağlantıyı Kes
        </button>
      ) : (
        <a
          href={connectUrl}
          className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition"
        >
          Bağla
        </a>
      )}
    </div>
  )
}
