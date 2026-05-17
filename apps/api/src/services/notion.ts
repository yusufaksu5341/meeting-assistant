import { Client } from '@notionhq/client'
import type { Meeting, Task } from '@prisma/client'

type MeetingWithTasks = Meeting & { tasks: Task[] }

export async function createMeetingPage(
  token: string,
  databaseId: string,
  meeting: MeetingWithTasks,
): Promise<void> {
  const notion = new Client({ auth: token })

  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name: { title: [{ text: { content: meeting.title ?? 'Toplantı' } }] },
      Date: { date: { start: meeting.startedAt?.toISOString() ?? new Date().toISOString() } },
      Status: { select: { name: 'Tamamlandı' } },
    },
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: '📝 Özet' } }] },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: meeting.summary ?? '' } }] },
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: '✅ Görevler' } }] },
      },
      ...meeting.tasks.map((t) => ({
        object: 'block' as const,
        type: 'to_do' as const,
        to_do: {
          rich_text: [{ text: { content: `[${t.assignee}] ${t.content}${t.deadline ? ` (${t.deadline})` : ''}` } }],
          checked: t.done,
        },
      })),
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: '🗳️ Kararlar' } }] },
      },
      ...((meeting.decisions ?? []).length > 0
        ? meeting.decisions.map((d) => ({
            object: 'block' as const,
            type: 'bulleted_list_item' as const,
            bulleted_list_item: { rich_text: [{ text: { content: d } }] },
          }))
        : [{
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: { rich_text: [{ text: { content: 'Karar alınmadı' } }] },
          }]),
    ],
  })
}

export async function getNotionOAuthToken(code: string): Promise<{ access_token: string; bot_id: string }> {
  const clientId = process.env['NOTION_CLIENT_ID']
  const clientSecret = process.env['NOTION_CLIENT_SECRET']
  if (!clientId || !clientSecret) throw new Error('Notion OAuth credentials are not set')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'authorization_code', code }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Notion OAuth failed (${res.status}): ${body}`)
  }

  return res.json() as Promise<{ access_token: string; bot_id: string }>
}
