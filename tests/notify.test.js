const { buildNotifyPayload } = require('../src/main/notify')

describe('buildNotifyPayload', () => {
  const today = '2026-03-30'

  test('returns empty lists when no todos', () => {
    const payload = buildNotifyPayload([], today)
    expect(payload.todayTodos).toEqual([])
    expect(payload.overdueTodos).toEqual([])
  })

  test('separates today todos from overdue', () => {
    const todos = [
      { id: 1, title: '오늘 할 일', due_date: '2026-03-30', completed: 0, persona_name: '직장인' },
      { id: 2, title: '밀린 할 일', due_date: '2026-03-28', completed: 0, persona_name: '남편' },
      { id: 3, title: '완료된 할 일', due_date: '2026-03-30', completed: 1, persona_name: '직장인' }
    ]
    const payload = buildNotifyPayload(todos, today)
    expect(payload.todayTodos).toHaveLength(1)
    expect(payload.todayTodos[0].title).toBe('오늘 할 일')
    expect(payload.overdueTodos).toHaveLength(1)
    expect(payload.overdueTodos[0].title).toBe('밀린 할 일')
  })

  test('buildSlackMessage formats correctly', () => {
    const { buildSlackMessage } = require('../src/main/notify')
    const payload = {
      date: '3월 30일',
      todayTodos: [{ title: '보고서 작성', persona_name: '직장인' }],
      overdueTodos: [{ title: '꽃 사기', persona_name: '남편', due_date: '2026-03-28' }]
    }
    const msg = buildSlackMessage(payload)
    expect(msg).toContain('3월 30일')
    expect(msg).toContain('[직장인] 보고서 작성')
    expect(msg).toContain('[남편] 꽃 사기')
    expect(msg).toContain('3/28')
  })
})
