const cron = require('node-cron')

function buildNotifyPayload(todos, today) {
  const incomplete = todos.filter(t => t.completed === 0)
  const todayTodos = incomplete.filter(t => t.due_date === today)
  const overdueTodos = incomplete.filter(t => t.due_date && t.due_date < today)
  return { todayTodos, overdueTodos }
}

function buildSlackMessage({ date, todayTodos, overdueTodos }) {
  let msg = `📋 오늘의 할 일 (${date})\n`

  if (todayTodos.length > 0) {
    msg += '\n오늘 마감\n'
    for (const t of todayTodos) {
      msg += `• [${t.persona_name || '없음'}] ${t.title}\n`
    }
  }

  if (overdueTodos.length > 0) {
    msg += '\n밀린 항목\n'
    for (const t of overdueTodos) {
      const d = t.due_date ? t.due_date.slice(5).replace('-', '/') : '날짜 없음'
      msg += `• [${t.persona_name || '없음'}] ${t.title} (${d} 마감)\n`
    }
  }

  return msg
}

async function sendSlackNotification(webhookUrl, message) {
  if (!webhookUrl) return
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  })
}

function scheduleNotify(db, notifyFn) {
  let task = null

  function reload() {
    if (task) { task.stop(); task = null }

    const timeRow = db.prepare("SELECT value FROM settings WHERE key='notify_time'").get()
    const time = (timeRow && timeRow.value) || '08:00'
    const [hour, minute] = time.split(':')

    task = cron.schedule(`${minute} ${hour} * * *`, async () => {
      const today = new Date().toISOString().slice(0, 10)
      const todos = db.prepare(`
        SELECT t.*, p.name as persona_name
        FROM todos t
        LEFT JOIN personas p ON t.persona_id = p.id
        WHERE t.completed = 0
      `).all()

      const payload = buildNotifyPayload(todos, today)
      payload.date = formatKoreanDate(today)

      const webhookRow = db.prepare("SELECT value FROM settings WHERE key='slack_webhook_url'").get()
      const webhookUrl = webhookRow && webhookRow.value

      const slackMsg = buildSlackMessage(payload)
      await sendSlackNotification(webhookUrl, slackMsg)

      if (notifyFn) notifyFn(payload)
    })
  }

  reload()
  return { reload, stop: () => task && task.stop() }
}

function formatKoreanDate(isoDate) {
  const [, month, day] = isoDate.split('-')
  return `${parseInt(month)}월 ${parseInt(day)}일`
}

module.exports = { buildNotifyPayload, buildSlackMessage, scheduleNotify }
