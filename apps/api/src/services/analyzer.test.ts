import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeMeeting } from './analyzer.js'

vi.mock('../lib/openai.js', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

import { openai } from '../lib/openai.js'

const mockCreate = vi.mocked(openai.chat.completions.create)

const validResponse = {
  title: 'Sprint Planlama Toplantısı',
  summary: '• Sprint hedefleri belirlendi\n• Görev dağılımı yapıldı',
  tasks: [
    { assignee: 'Ahmet', content: 'Login sayfasını tasarla', deadline: '2024-02-01', priority: 'high' as const },
    { assignee: 'Belirsiz', content: 'API dokümantasyonu yaz', deadline: null, priority: 'medium' as const },
  ],
  decisions: ['React kullanılacak', 'Deploy Cuma günü yapılacak'],
}

describe('analyzeMeeting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('geçerli transkripti doğru şekilde analiz eder', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validResponse) } }],
    } as never)

    const result = await analyzeMeeting('Ahmet: Login sayfasını ben yapayım.')

    expect(result.title).toBe('Sprint Planlama Toplantısı')
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[0]?.priority).toBe('high')
    expect(result.decisions).toHaveLength(2)
  })

  it('OpenAI boş yanıt dönerse hata fırlatır', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as never)

    await expect(analyzeMeeting('test')).rejects.toThrow('OpenAI boş yanıt döndürdü')
  })

  it('eksik alan içeren JSON için hata fırlatır', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ title: 'Sadece başlık var' }) } }],
    } as never)

    await expect(analyzeMeeting('test')).rejects.toThrow('beklenen formatla uyuşmuyor')
  })
})
