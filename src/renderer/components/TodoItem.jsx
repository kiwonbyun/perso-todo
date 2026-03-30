export function TodoItem({ todo, persona, onToggle, onClick }) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = todo.due_date && todo.due_date < today && !todo.completed

  return (
    <div
      className={`todo-item ${todo.completed ? 'completed' : ''}`}
      onClick={() => onClick(todo)}
    >
      <div
        className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
        style={!todo.completed && persona ? { borderColor: persona.color } : {}}
        onClick={(e) => { e.stopPropagation(); onToggle(todo) }}
      >
        {todo.completed && <span style={{ fontSize: 10, color: '#1e1e2e', fontWeight: 700 }}>✓</span>}
      </div>
      <div className="todo-body">
        <div className="todo-title">{todo.title}</div>
        <div className="todo-meta">
          {persona && (
            <span className="todo-persona" style={{ color: persona.color }}>
              {persona.name}
            </span>
          )}
          {todo.due_date && (
            <span className={`todo-date ${isOverdue ? 'overdue' : ''}`}>
              {formatDate(todo.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(isoDate) {
  const [, m, d] = isoDate.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}
