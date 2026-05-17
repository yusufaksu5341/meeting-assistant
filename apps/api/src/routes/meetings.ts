import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { sendBot } from '../services/recall.js'

const startMeetingSchema = z.object({
  meetingUrl: z.string().url(),
  platform: z.enum(['zoom', 'meet', 'teams']),
  userId: z.string().min(1),
})

export async function meetingsRouter(fastify: FastifyInstance) {
  fastify.post('/meetings/start', async (request, reply) => {
    const parsed = startMeetingSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Geçersiz istek', details: parsed.error.flatten() })
    }

    const { meetingUrl, platform, userId } = parsed.data

    const meeting = await prisma.meeting.create({
      data: {
        userId,
        platform,
        status: 'PENDING',
      },
    })

    try {
      const webhookBase = process.env['WEBHOOK_BASE_URL']
      if (!webhookBase) throw new Error('WEBHOOK_BASE_URL environment variable is not set')

      const bot = await sendBot(meetingUrl, `${webhookBase}/webhooks/recall`)

      const updated = await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          botId: bot.id,
          status: 'JOINING',
          startedAt: new Date(),
        },
      })

      return reply.status(201).send(updated)
    } catch (err) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'FAILED' },
      })

      fastify.log.error(err, 'Bot gönderme başarısız')
      return reply.status(502).send({ error: 'Bot toplantıya katılamadı', meetingId: meeting.id })
    }
  })

  fastify.get('/meetings', async (request, reply) => {
    const query = request.query as Record<string, string>
    const userId = query['userId']

    if (!userId) {
      return reply.status(400).send({ error: 'userId gerekli' })
    }

    const meetings = await prisma.meeting.findMany({
      where: { userId },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(meetings)
  })

  fastify.get('/meetings/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { tasks: true },
    })

    if (!meeting) {
      return reply.status(404).send({ error: 'Toplantı bulunamadı' })
    }

    return reply.send(meeting)
  })
}
