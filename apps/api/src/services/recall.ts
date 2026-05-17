export interface RecallBot {
  id: string
  meeting_url: string
  status: { code: string }
}

export async function sendBot(meetingUrl: string, webhookUrl: string): Promise<RecallBot> {
  const apiKey = process.env['RECALL_API_KEY']
  if (!apiKey) throw new Error('RECALL_API_KEY environment variable is not set')

  const res = await fetch('https://api.recall.ai/api/v1/bot/', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: 'Toplantı Asistanı 🤖',
      transcription_options: { provider: 'deepgram' },
      real_time_transcription: { destination_url: webhookUrl },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Recall.ai bot creation failed (${res.status}): ${body}`)
  }

  return res.json() as Promise<RecallBot>
}

export async function getBotTranscript(botId: string): Promise<string> {
  const apiKey = process.env['RECALL_API_KEY']
  if (!apiKey) throw new Error('RECALL_API_KEY environment variable is not set')

  const res = await fetch(`https://api.recall.ai/api/v1/bot/${botId}/transcript/`, {
    headers: { Authorization: `Token ${apiKey}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Recall.ai transcript fetch failed (${res.status}): ${body}`)
  }

  const data = await res.json() as Array<{ words: Array<{ text: string }>; speaker: string }>
  return data
    .map((segment) => `${segment.speaker}: ${segment.words.map((w) => w.text).join(' ')}`)
    .join('\n')
}
