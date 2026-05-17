import { WebClient } from '@slack/web-api'
import type { Meeting, Task } from '@prisma/client'

type MeetingWithTasks = Meeting & { tasks: Task[] }

function priorityEmoji(priority: string): string {
  if (priority === 'HIGH') return '🔴'
  if (priority === 'MEDIUM') return '🟡'
  return '🟢'
}

export async function sendMeetingSummary(
  token: string,
  channel: string,
  meeting: MeetingWithTasks,
): Promise<void> {
  const client = new WebClient(token)

  const taskLines = meeting.tasks.length > 0
    ? meeting.tasks
        .map((t) => `${priorityEmoji(t.priority)} *${t.assignee}:* ${t.content}${t.deadline ? ` _(${t.deadline})_` : ''}`)
        .join('\n')
    : '_Görev tespit edilmedi_'

  const decisionLines = (meeting.decisions ?? []).length > 0
    ? meeting.decisions.map((d) => `• ${d}`).join('\n')
    : '_Karar alınmadı_'

  await client.chat.postMessage({
    channel,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📋 ${meeting.title ?? 'Toplantı Özeti'}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: meeting.summary ?? '' },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Görevler:*\n${taskLines}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Kararlar:*\n${decisionLines}` },
      },
    ],
  })
}

export async function getSlackOAuthToken(code: string): Promise<{ access_token: string; authed_user: { id: string } }> {
  const clientId = process.env['SLACK_CLIENT_ID']
  const clientSecret = process.env['SLACK_CLIENT_SECRET']
  if (!clientId || !clientSecret) throw new Error('Slack OAuth credentials are not set')

  const client = new WebClient()
  const res = await client.oauth.v2.access({
    client_id: clientId,
    client_secret: clientSecret,
    code,
  })

  if (!res.ok || !res.access_token) {
    throw new Error(`Slack OAuth failed: ${res.error ?? 'unknown error'}`)
  }

  return { access_token: res.access_token, authed_user: res.authed_user as { id: string } }
}
