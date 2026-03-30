import { useState, useCallback } from 'react'

let _show = null

export function useToast() {
  return { toast: (msg, duration = 3000) => _show && _show(msg, duration) }
}

export function ToastProvider() {
  const [items, setItems] = useState([])

  _show = useCallback((msg, duration = 3000) => {
    const id = Date.now()
    setItems(prev => [...prev, { id, msg }])
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), duration)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="toast-container">
      {items.map(item => (
        <div key={item.id} className="toast">{item.msg}</div>
      ))}
    </div>
  )
}
