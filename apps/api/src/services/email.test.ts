import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendMeetingEmail } from './email.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const baseMeeting = {
  id: 'meet_1',
  userId: 'user_1',
  botId: null,
  platform: 'zoom',
  title: 'Sprint Toplantısı',
  summary: 'Hedefler belirlendi',
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

describe('sendMeetingEmail', () => {
  beforeEach(() => {
    process.env['RESEND_API_KEY'] = 'test_key'
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'email_1' }) })
  })

  afterEach(() => {
    delete process.env['RESEND_API_KEY']
    vi.clearAllMocks()
  })

  it('Resend API\'ye doğru payload ile istek atar', async () => {
    await sendMeetingEmail('test@example.com', baseMeeting)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')

    const body = JSON.parse(options.body as string) as { to: string; subject: string }
    expect(body.to).toBe('test@example.com')
    expect(body.subject).toContain('Sprint Toplantısı')
  })

  it('RESEND_API_KEY yoksa hata fırlatır', async () => {
    delete process.env['RESEND_API_KEY']
    await expect(sendMeetingEmail('test@example.com', baseMeeting)).rejects.toThrow('RESEND_API_KEY')
  })

  it('Resend 4xx dönerse hata fırlatır', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: { message: 'Invalid email' } }),
    })
    await expect(sendMeetingEmail('bad', baseMeeting)).rejects.toThrow('Invalid email')
  })
})
