import type { FastifyInstance } from 'fastify'
import { meetingQueue } from '../jobs/processMeeting.js'

interface RecallWebhookPayload {
  event: string
  data: {
    bot_id: string
    transcript?: { url: string }
  }
}

export async function webhooksRouter(fastify: FastifyInstance) {
  fastify.post('/recall', async (request, reply) => {
    const payload = request.body as RecallWebhookPayload
    const { event, data } = payload

    fastify.log.info({ event, botId: data.bot_id }, '[Webhook] Recall.ai event received')

    if (event === 'bot.done') {
      await meetingQueue.add(
        'process',
        { botId: data.bot_id, transcriptUrl: data.transcript?.url },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      )
    }

    return reply.send({ ok: true })
  })
}
