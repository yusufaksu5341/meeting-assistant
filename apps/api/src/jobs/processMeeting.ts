import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { getBotTranscript } from '../services/recall.js'
import { analyzeMeeting } from '../services/analyzer.js'
import { sendMeetingSummary } from '../services/slack.js'
import { createMeetingPage } from '../services/notion.js'

export interface ProcessMeetingJob {
  botId: string
  transcriptUrl?: string
}

export const meetingQueue = new Queue<ProcessMeetingJob>('meetings', { connection: redis })

export const meetingWorker = new Worker<ProcessMeetingJob>(
  'meetings',
  async (job) => {
    const { botId } = job.data

    const meeting = await prisma.meeting.findFirst({ where: { botId } })
    if (!meeting) {
      throw new Error(`Meeting not found for botId: ${botId}`)
    }

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: 'PROCESSING' },
    })

    try {
      const transcript = await getBotTranscript(botId)

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { transcript, endedAt: new Date() },
      })

      const analysis = await analyzeMeeting(transcript)

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          title: analysis.title,
          summary: analysis.summary,
          decisions: analysis.decisions,
          status: 'DONE',
        },
      })

      await prisma.task.createMany({
        data: analysis.tasks.map((t) => ({
          meetingId: meeting.id,
          assignee: t.assignee,
          content: t.content,
          deadline: t.deadline ?? undefined,
          priority: t.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
        })),
      })

      const finishedMeeting = await prisma.meeting.findUnique({
        where: { id: meeting.id },
        include: { tasks: true, user: true },
      })

      if (finishedMeeting) {
        const { user } = finishedMeeting

        if (user.slackToken) {
          const slackChannel = process.env['SLACK_DEFAULT_CHANNEL'] ?? '#genel'
          await sendMeetingSummary(user.slackToken, slackChannel, finishedMeeting).catch((err) => {
            console.error('[Slack] Mesaj gönderilemedi:', err)
          })
        }

        if (user.notionToken) {
          const databaseId = process.env['NOTION_DATABASE_ID'] ?? ''
          if (databaseId) {
            await createMeetingPage(user.notionToken, databaseId, finishedMeeting).catch((err) => {
              console.error('[Notion] Sayfa oluşturulamadı:', err)
            })
          }
        }
      }
    } catch (err) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'FAILED' },
      })
      throw err
    }
  },
  {
    connection: redis,
    concurrency: 5,
  },
)

meetingWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message)
})

meetingWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`)
})
