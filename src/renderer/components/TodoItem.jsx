import confetti from 'canvas-confetti'

export function TodoItem({ todo, persona, onToggle, onClick, onDelete }) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = todo.due_date && todo.due_date < today && !todo.completed

  function handleComplete(e) {
    e.stopPropagation()
    if (!todo.completed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#cba6f7', '#a6e3a1', '#89b4fa', '#fab387', '#f38ba8']
      })
    }
    onToggle(todo)
  }

  function handleDelete(e) {
    e.stopPropagation()
    onDelete(todo)
  }

  return (
    <div
      className={`todo-item ${todo.completed ? 'completed' : ''}`}
      onClick={() => onClick(todo)}
    >
      <div className="todo-body">
        <div className="todo-title">{todo.title}</div>
        {todo.memo && <div className="todo-memo"><MemoWithLinks text={todo.memo} /></div>}
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

      {onDelete && (
        <div className="todo-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`todo-action-btn todo-action-complete ${todo.completed ? 'is-completed' : ''}`}
            onClick={handleComplete}
            title={todo.completed ? '완료 취소' : '완료'}
          >
            ✓
          </button>
          <button
            className="todo-action-btn todo-action-delete"
            onClick={handleDelete}
            title="삭제"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function MemoWithLinks({ text }) {
  const URL_RE = /(https?:\/\/[^\s]+)/g
  const parts = text.split(URL_RE)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href="#"
        className="memo-link"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.electronAPI?.openExternal(part) }}
      >
        {part}
      </a>
    ) : part
  )
}

function formatDate(isoDate) {
  const [, m, d] = isoDate.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}
