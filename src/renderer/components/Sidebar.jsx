export function Sidebar({ view, onViewChange, personas, personaFilter, onPersonaFilterChange }) {
  const views = [
    { id: 'today', label: '📅 오늘' },
    { id: 'week', label: '📆 이번 주' },
    { id: 'month', label: '🗓 월간' }
  ]

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">perso-todo</div>

      <div className="sidebar-section-label">뷰</div>
      {views.map(v => (
        <div
          key={v.id}
          className={`sidebar-item ${view === v.id ? 'active' : ''}`}
          onClick={() => onViewChange(v.id)}
        >
          {v.label}
        </div>
      ))}

      <div className="sidebar-section-label">페르소나</div>
      <div
        className={`sidebar-item ${personaFilter === null ? 'active' : ''}`}
        onClick={() => onPersonaFilterChange(null)}
      >
        전체
      </div>
      {personas.map(p => (
        <div
          key={p.id}
          className={`sidebar-item ${personaFilter === p.id ? 'active' : ''}`}
          onClick={() => onPersonaFilterChange(p.id)}
        >
          <span className="persona-dot" style={{ background: p.color }} />
          {p.name}
        </div>
      ))}

      <div className="sidebar-bottom">
        <div
          className={`sidebar-item ${view === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          ⚙ 설정
        </div>
      </div>
    </nav>
  )
}
