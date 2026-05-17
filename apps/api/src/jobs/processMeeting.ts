import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { getBotTranscript } from '../services/recall.js'

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
        data: {
          transcript,
          endedAt: new Date(),
        },
      })

      // Faz 2'de buraya analyzer.ts entegre edilecek
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'DONE' },
      })
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
