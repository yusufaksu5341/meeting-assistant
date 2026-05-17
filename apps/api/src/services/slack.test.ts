import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendMeetingSummary } from './slack.js'

const mockPostMessage = vi.fn()

vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => ({
    chat: { postMessage: mockPostMessage },
    oauth: { v2: { access: vi.fn() } },
  })),
}))

const baseMeeting = {
  id: 'meet_1',
  userId: 'user_1',
  botId: null,
  platform: 'zoom',
  title: 'Sprint Toplantısı',
  summary: '• Hedefler belirlendi',
  transcript: null,
  decisions: ['React kullanılacak'],
  status: 'DONE' as const,
  startedAt: new Date(),
  endedAt: new Date(),
  createdAt: new Date(),
  tasks: [
    {
      id: 'task_1',
      meetingId: 'meet_1',
      assignee: 'Ahmet',
      content: 'Login sayfası',
      deadline: '2024-02-01',
      priority: 'HIGH' as const,
      done: false,
      createdAt: new Date(),
    },
  ],
}

describe('sendMeetingSummary', () => {
  beforeEach(() => {
    mockPostMessage.mockResolvedValue({ ok: true })
  })

  it('doğru blok yapısıyla mesaj gönderir', async () => {
    await sendMeetingSummary('xoxb-token', '#genel', baseMeeting)

    expect(mockPostMessage).toHaveBeenCalledOnce()
    const call = mockPostMessage.mock.calls[0]?.[0]
    expect(call.channel).toBe('#genel')
    expect(call.blocks[0].text.text).toContain('Sprint Toplantısı')
  })

  it('görev yoksa "_Görev tespit edilmedi_" yazar', async () => {
    await sendMeetingSummary('xoxb-token', '#genel', { ...baseMeeting, tasks: [] })

    const call = mockPostMessage.mock.calls[0]?.[0]
    const taskBlock = call.blocks.find((b: { text?: { text?: string } }) => b.text?.text?.includes('Görev'))
    expect(taskBlock.text.text).toContain('_Görev tespit edilmedi_')
  })
})
