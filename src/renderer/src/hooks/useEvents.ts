import { useState, useEffect, useCallback } from 'react'
import { GanttEvent } from '../types'

export function useEvents() {
  const [events, setEvents] = useState<GanttEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await window.api.events.getAll()
    setEvents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createEvent = useCallback(async (data: Omit<GanttEvent, 'id'>) => {
    const created = await window.api.events.create(data)
    setEvents(prev => [...prev, created])
    return created
  }, [])

  const updateEvent = useCallback(async (id: number, data: Partial<GanttEvent>) => {
    const updated = await window.api.events.update(id, data)
    setEvents(prev => prev.map(e => e.id === id ? updated : e))
    return updated
  }, [])

  const deleteEvent = useCallback(async (id: number) => {
    await window.api.events.delete(id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }, [])

  const moveEvent = useCallback(async (id: number, direction: 'up' | 'down', groupId: number | null) => {
    const groupEvents = [...events]
      .filter(e => e.group_id === groupId)
      .sort((a, b) => a.sort_order - b.sort_order)

    const idx = groupEvents.findIndex(e => e.id === id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= groupEvents.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const a = groupEvents[idx]
    const b = groupEvents[swapIdx]

    await window.api.events.update(a.id, { sort_order: b.sort_order })
    await window.api.events.update(b.id, { sort_order: a.sort_order })

    setEvents(prev => prev.map(e => {
      if (e.id === a.id) return { ...a, sort_order: b.sort_order }
      if (e.id === b.id) return { ...b, sort_order: a.sort_order }
      return e
    }))
  }, [events])

  return { events, loading, createEvent, updateEvent, deleteEvent, moveEvent, reload: load }
}
