import { useState, useEffect } from 'react'
import { api } from '../api'
import { useToast } from './Toast'

const PRESET_COLORS = ['#89b4fa', '#f38ba8', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af', '#94e2d5', '#eba0ac']

export function Settings({ personas, onRefresh }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="view-header">
        <h1 className="view-title">설정</h1>
      </div>
      <NotificationSection />
      <PersonaSection personas={personas} onRefresh={onRefresh} />
    </div>
  )
}

function NotificationSection() {
  const [times, setTimes] = useState(['08:00'])
  const [slackUrl, setSlackUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api.getSettings().then(s => {
      try {
        const parsed = JSON.parse(s.notify_time)
        if (Array.isArray(parsed)) setTimes(parsed)
      } catch { setTimes(['08:00']) }
      setSlackUrl(s.slack_webhook_url ?? '')
    })
  }, [])

  function addTime() { setTimes(t => [...t, '08:00']) }
  function removeTime(i) { setTimes(t => t.filter((_, idx) => idx !== i)) }
  function updateTime(i, val) { setTimes(t => t.map((v, idx) => idx === i ? val : v)) }

  async function save(e) {
    e.preventDefault()
    await api.updateSettings({
      notify_time: JSON.stringify(times.filter(Boolean)),
      slack_webhook_url: slackUrl
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    const timeList = times.filter(Boolean).join(', ')
    toast(`알림 설정 저장됨 — ${timeList}에 알림이 옵니다`)
  }

  return (
    <form onSubmit={save}>
      <div className="settings-section">
        <div className="settings-section-title">알림</div>

        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="settings-row-label">알림 시간</span>
            <button type="button" className="btn-icon" onClick={addTime} style={{ color: 'var(--accent)', fontSize: 20 }}>＋</button>
          </div>
          {times.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
              <input
                type="time"
                value={t}
                onChange={e => updateTime(i, e.target.value)}
                style={{ width: 200 }}
              />
              {times.length > 1 && (
                <button type="button" className="btn-icon btn-danger" onClick={() => removeTime(i)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span className="settings-row-label">Slack Webhook URL</span>
          <input
            type="url"
            value={slackUrl}
            onChange={e => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
          />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button type="submit" className="btn-primary">
          {saved ? '저장됨 ✓' : '알림 설정 저장'}
        </button>
      </div>
    </form>
  )
}

function PersonaSection({ personas, onRefresh }) {
  const [defaultPersonaId, setDefaultPersonaId] = useState('')
  const [defaultSaved, setDefaultSaved] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    api.getSettings().then(s => setDefaultPersonaId(s.default_persona_id ?? ''))
  }, [])

  async function saveDefault(e) {
    e.preventDefault()
    await api.updateSettings({ default_persona_id: defaultPersonaId })
    setDefaultSaved(true)
    setTimeout(() => setDefaultSaved(false), 2000)
  }

  async function addPersona(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await api.createPersona({ name: newName.trim(), color: newColor })
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    onRefresh()
  }

  function startEdit(p) { setEditingId(p.id); setEditName(p.name); setEditColor(p.color) }

  async function saveEdit(id) {
    await api.updatePersona(id, { name: editName, color: editColor })
    setEditingId(null)
    onRefresh()
  }

  async function deletePersona(id) {
    if (!window.confirm('이 페르소나를 삭제하시겠어요?')) return
    await api.deletePersona(id)
    onRefresh()
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">페르소나 관리</div>

      {/* Default persona */}
      <form onSubmit={saveDefault}>
        <div className="settings-row">
          <span className="settings-row-label">기본 페르소나</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={defaultPersonaId} onChange={e => setDefaultPersonaId(e.target.value)} style={{ width: 140 }}>
              <option value="">없음</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: 13 }}>
              {defaultSaved ? '✓' : '저장'}
            </button>
          </div>
        </div>
      </form>

      <div style={{ borderTop: '1px solid var(--bg-surface1)', margin: '12px 0' }} />

      {/* Persona list */}
      {personas.map(p => (
        <div key={p.id} className="persona-row">
          {editingId === p.id ? (
            <>
              <div
                className="color-swatch"
                style={{ background: editColor, cursor: 'pointer' }}
                onClick={() => setEditColor(PRESET_COLORS[(PRESET_COLORS.indexOf(editColor) + 1) % PRESET_COLORS.length])}
              />
              <input value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1 }} autoFocus
                onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)} />
              <button className="btn-icon" onClick={() => saveEdit(p.id)}>✓</button>
              <button className="btn-icon" onClick={() => setEditingId(null)}>✕</button>
            </>
          ) : (
            <>
              <div className="color-swatch" style={{ background: p.color }} />
              <span style={{ flex: 1 }}>{p.name}</span>
              <div className="persona-row-actions">
                <button className="btn-icon" onClick={() => startEdit(p)}>✎</button>
                <button className="btn-icon btn-danger" onClick={() => deletePersona(p.id)}>🗑</button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add new */}
      <form onSubmit={addPersona} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <div
          className="color-swatch"
          style={{ background: newColor, cursor: 'pointer', flexShrink: 0 }}
          onClick={() => setNewColor(PRESET_COLORS[(PRESET_COLORS.indexOf(newColor) + 1) % PRESET_COLORS.length])}
          title="클릭으로 색상 변경"
        />
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="새 페르소나 이름" style={{ flex: 1 }} />
        <button type="submit" className="btn-primary" disabled={!newName.trim()}>추가</button>
      </form>
    </div>
  )
}
