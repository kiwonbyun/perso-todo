import { useState, useEffect } from 'react'
import { api } from '../api'

const PRESET_COLORS = ['#89b4fa', '#f38ba8', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af', '#94e2d5', '#eba0ac']

export function Settings({ personas, onRefresh }) {
  const [notifyTime, setNotifyTime] = useState('08:00')
  const [slackUrl, setSlackUrl] = useState('')
  const [saved, setSaved] = useState(false)

  // Persona form
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    api.getSettings().then(s => {
      if (s.notify_time) setNotifyTime(s.notify_time)
      if (s.slack_webhook_url) setSlackUrl(s.slack_webhook_url)
    })
  }, [])

  async function saveSettings(e) {
    e.preventDefault()
    await api.updateSettings({ notify_time: notifyTime, slack_webhook_url: slackUrl })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addPersona(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await api.createPersona({ name: newName.trim(), color: newColor })
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    onRefresh()
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditName(p.name)
    setEditColor(p.color)
  }

  async function saveEdit(id) {
    await api.updatePersona(id, { name: editName, color: editColor })
    setEditingId(null)
    onRefresh()
  }

  async function deletePersona(id) {
    if (!window.confirm('이 페르소나를 삭제하시겠어요? 해당 페르소나의 할 일은 페르소나 없음으로 변경됩니다.')) return
    await api.deletePersona(id)
    onRefresh()
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="view-header">
        <h1 className="view-title">설정</h1>
      </div>

      {/* Notification settings */}
      <form onSubmit={saveSettings}>
        <div className="settings-section">
          <div className="settings-section-title">알림</div>

          <div className="settings-row">
            <span className="settings-row-label">알림 시간</span>
            <input
              type="time"
              value={notifyTime}
              onChange={e => setNotifyTime(e.target.value)}
              style={{ width: 120 }}
            />
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Slack Webhook URL</span>
          </div>
          <input
            type="url"
            value={slackUrl}
            onChange={e => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            style={{ marginTop: 8 }}
          />
        </div>

        <button type="submit" className="btn-primary" style={{ marginBottom: 16 }}>
          {saved ? '저장됨 ✓' : '알림 설정 저장'}
        </button>
      </form>

      {/* Persona management */}
      <div className="settings-section">
        <div className="settings-section-title">페르소나 관리</div>

        {personas.map(p => (
          <div key={p.id} className="persona-row">
            {editingId === p.id ? (
              <>
                <div
                  className="color-swatch"
                  style={{ background: editColor }}
                  onClick={() => {
                    const idx = PRESET_COLORS.indexOf(editColor)
                    setEditColor(PRESET_COLORS[(idx + 1) % PRESET_COLORS.length])
                  }}
                />
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ flex: 1 }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)}
                />
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

        {/* Add new persona */}
        <form onSubmit={addPersona} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <div
            className="color-swatch"
            style={{ background: newColor, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => {
              const idx = PRESET_COLORS.indexOf(newColor)
              setNewColor(PRESET_COLORS[(idx + 1) % PRESET_COLORS.length])
            }}
            title="클릭으로 색상 변경"
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="새 페르소나 이름"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" disabled={!newName.trim()}>추가</button>
        </form>
      </div>
    </div>
  )
}
