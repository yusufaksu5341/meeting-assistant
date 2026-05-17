import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMeetingPage } from './notion.js'

const mockCreate = vi.fn()

vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    pages: { create: mockCreate },
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
  startedAt: new Date('2024-01-15T10:00:00Z'),
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

describe('createMeetingPage', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue({ id: 'page_1' })
  })

  it('doğru title ve date ile sayfa oluşturur', async () => {
    await createMeetingPage('secret_token', 'db_123', baseMeeting)

    expect(mockCreate).toHaveBeenCalledOnce()
    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.parent.database_id).toBe('db_123')
    expect(call.properties.Name.title[0].text.content).toBe('Sprint Toplantısı')
    expect(call.properties.Date.date.start).toContain('2024-01-15')
  })

  it('görevleri to_do bloğu olarak ekler', async () => {
    await createMeetingPage('secret_token', 'db_123', baseMeeting)

    const call = mockCreate.mock.calls[0]?.[0]
    const todoBlocks = call.children.filter((b: { type: string }) => b.type === 'to_do')
    expect(todoBlocks).toHaveLength(1)
    expect(todoBlocks[0].to_do.rich_text[0].text.content).toContain('Ahmet')
  })

  it('görev yoksa to_do bloğu olmaz', async () => {
    await createMeetingPage('secret_token', 'db_123', { ...baseMeeting, tasks: [] })

    const call = mockCreate.mock.calls[0]?.[0]
    const todoBlocks = call.children.filter((b: { type: string }) => b.type === 'to_do')
    expect(todoBlocks).toHaveLength(0)
  })
})
