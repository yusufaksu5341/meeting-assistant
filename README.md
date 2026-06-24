# meeting-assistant

Toplantılara bot katılıp transkript alan ve GPT ile analiz eden bir servis.

## Ne yapıyor

- Zoom, Google Meet ya da Teams linkini veriyorsun, bot katılıyor
- Toplantı bitince transkript analiz ediliyor: özet, görevler, alınan kararlar
- Görevler Notion'a, özet Slack'e gönderiliyor
- Stripe ile abonelik yönetimi mevcut

## Stack

- Node.js, Fastify, TypeScript
- PostgreSQL + Prisma ORM
- Redis, BullMQ
- OpenAI GPT-4o-mini
- Recall.ai (bot), Notion API, Slack API, Stripe

## Kurulum

```bash
cp .env.example .env
npm install
npm run dev
```
