import type { Meeting, Task } from '@prisma/client'

type MeetingWithTasks = Meeting & { tasks: Task[] }

interface ResendResponse {
  id?: string
  error?: { message: string }
}

export async function sendMeetingEmail(to: string, meeting: MeetingWithTasks): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) throw new Error('RESEND_API_KEY environment variable is not set')

  const from = process.env['EMAIL_FROM'] ?? 'Toplantı Asistanı <noreply@toplanti.app>'

  const taskRows = meeting.tasks.length > 0
    ? meeting.tasks
        .map((t) => `<tr>
          <td style="padding:6px 0;color:#374151">${t.assignee}</td>
          <td style="padding:6px 8px;color:#374151">${t.content}</td>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">${t.deadline ?? '—'}</td>
          <td style="padding:6px 0">
            <span style="padding:2px 8px;border-radius:9999px;font-size:12px;background:${t.priority === 'HIGH' ? '#fee2e2' : t.priority === 'MEDIUM' ? '#fef9c3' : '#dcfce7'};color:${t.priority === 'HIGH' ? '#b91c1c' : t.priority === 'MEDIUM' ? '#a16207' : '#166534'}">${t.priority === 'HIGH' ? 'Yüksek' : t.priority === 'MEDIUM' ? 'Orta' : 'Düşük'}</span>
          </td>
        </tr>`)
        .join('')
    : '<tr><td colspan="4" style="color:#9ca3af;padding:8px 0">Görev tespit edilmedi</td></tr>'

  const decisionList = (meeting.decisions ?? []).length > 0
    ? meeting.decisions.map((d) => `<li style="margin-bottom:4px;color:#374151">${d}</li>`).join('')
    : '<li style="color:#9ca3af">Karar alınmadı</li>'

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8" /></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#4f6ef7;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:18px">📋 ${meeting.title ?? 'Toplantı Özeti'}</h1>
    </div>
    <div style="padding:32px">
      <h2 style="font-size:15px;color:#111827;margin:0 0 8px">Özet</h2>
      <p style="color:#4b5563;white-space:pre-line;margin:0 0 24px">${meeting.summary ?? ''}</p>

      <h2 style="font-size:15px;color:#111827;margin:0 0 12px">Görevler</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="border-bottom:1px solid #e5e7eb">
            <th style="text-align:left;padding:6px 0;font-size:12px;color:#6b7280;font-weight:600">KİŞİ</th>
            <th style="text-align:left;padding:6px 8px;font-size:12px;color:#6b7280;font-weight:600">GÖREV</th>
            <th style="text-align:left;padding:6px 0;font-size:12px;color:#6b7280;font-weight:600">TARİH</th>
            <th style="text-align:left;padding:6px 0;font-size:12px;color:#6b7280;font-weight:600">ÖNCELİK</th>
          </tr>
        </thead>
        <tbody>${taskRows}</tbody>
      </table>

      <h2 style="font-size:15px;color:#111827;margin:0 0 8px">Alınan Kararlar</h2>
      <ul style="margin:0 0 24px;padding-left:20px">${decisionList}</ul>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">Toplantı Asistanı tarafından otomatik oluşturuldu</p>
    </div>
  </div>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: `📋 Toplantı Özeti: ${meeting.title ?? 'Toplantı'}`,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.json() as ResendResponse
    throw new Error(`Resend email failed: ${body.error?.message ?? res.status}`)
  }
}
