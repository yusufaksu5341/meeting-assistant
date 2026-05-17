import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getSlackOAuthToken } from '../services/slack.js'
import { getNotionOAuthToken } from '../services/notion.js'

const userIdSchema = z.object({ userId: z.string().min(1) })

export async function integrationsRouter(fastify: FastifyInstance) {
  // Slack OAuth callback
  fastify.get('/integrations/slack/callback', async (request, reply) => {
    const query = request.query as Record<string, string>
    const code = query['code']
    const userId = query['state']

    if (!code || !userId) {
      return reply.status(400).send({ error: 'code ve state parametreleri gerekli' })
    }

    try {
      const { access_token } = await getSlackOAuthToken(code)

      await prisma.user.update({
        where: { id: userId },
        data: { slackToken: access_token },
      })

      const frontendUrl = process.env['VITE_API_URL'] ?? 'http://localhost:5173'
      return reply.redirect(`${frontendUrl}/settings?slack=connected`)
    } catch (err) {
      fastify.log.error(err, 'Slack OAuth callback hatası')
      return reply.status(502).send({ error: 'Slack bağlantısı başarısız' })
    }
  })

  // Notion OAuth callback
  fastify.get('/integrations/notion/callback', async (request, reply) => {
    const query = request.query as Record<string, string>
    const code = query['code']
    const userId = query['state']

    if (!code || !userId) {
      return reply.status(400).send({ error: 'code ve state parametreleri gerekli' })
    }

    try {
      const { access_token } = await getNotionOAuthToken(code)

      await prisma.user.update({
        where: { id: userId },
        data: { notionToken: access_token },
      })

      const frontendUrl = process.env['VITE_API_URL'] ?? 'http://localhost:5173'
      return reply.redirect(`${frontendUrl}/settings?notion=connected`)
    } catch (err) {
      fastify.log.error(err, 'Notion OAuth callback hatası')
      return reply.status(502).send({ error: 'Notion bağlantısı başarısız' })
    }
  })

  // Entegrasyon durumu
  fastify.get('/integrations/status', async (request, reply) => {
    const parsed = userIdSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'userId gerekli' })
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { slackToken: true, notionToken: true },
    })

    if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' })

    return reply.send({
      slack: !!user.slackToken,
      notion: !!user.notionToken,
    })
  })

  // Entegrasyon bağlantısını kes
  fastify.delete('/integrations/:provider', async (request, reply) => {
    const { provider } = request.params as { provider: string }
    const parsed = userIdSchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.status(400).send({ error: 'userId gerekli' })
    }

    if (provider !== 'slack' && provider !== 'notion') {
      return reply.status(400).send({ error: 'Geçersiz provider' })
    }

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: provider === 'slack' ? { slackToken: null } : { notionToken: null },
    })

    return reply.send({ ok: true })
  })
}
