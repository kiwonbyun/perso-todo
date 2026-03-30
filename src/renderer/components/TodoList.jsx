import { TodoItem } from './TodoItem'

export function TodoList({ todos, personas, onToggle, onEdit, onDelete }) {
  const personaMap = Object.fromEntries(personas.map(p => [p.id, p]))

  if (todos.length === 0) {
    return <div style={{ color: 'var(--text-subtle)', fontSize: 14, padding: '20px 0' }}>할 일이 없습니다.</div>
  }

  return (
    <div className="todo-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          persona={todo.persona_id ? personaMap[todo.persona_id] : null}
          onToggle={onToggle}
          onClick={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
