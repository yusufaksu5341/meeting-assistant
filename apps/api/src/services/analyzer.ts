import { openai } from '../lib/openai.js'

export interface AnalysisResult {
  title: string
  summary: string
  tasks: Array<{
    assignee: string
    content: string
    deadline: string | null
    priority: 'high' | 'medium' | 'low'
  }>
  decisions: string[]
}

const SYSTEM_PROMPT = `Sen profesyonel bir toplantı asistanısın.
Verilen transkripti Türkçe analiz et.
YALNIZCA aşağıdaki JSON formatında yanıt ver:
{
  "title": "toplantının kısa başlığı",
  "summary": "3-5 madde halinde özet",
  "tasks": [
    {
      "assignee": "kişi adı veya 'Belirsiz'",
      "content": "görev açıklaması",
      "deadline": "tarih veya null",
      "priority": "high | medium | low"
    }
  ],
  "decisions": ["alınan karar 1", "alınan karar 2"]
}`

export async function analyzeMeeting(transcript: string): Promise<AnalysisResult> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
  })

  const content = completion.choices[0]?.message.content
  if (!content) throw new Error('OpenAI boş yanıt döndürdü')

  const parsed = JSON.parse(content) as Partial<AnalysisResult>

  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.decisions)) {
    throw new Error('OpenAI yanıtı beklenen formatla uyuşmuyor')
  }

  return parsed as AnalysisResult
}
