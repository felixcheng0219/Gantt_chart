import { useState, useEffect, useCallback } from 'react'
import { Group } from '../types'

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await window.api.groups.getAll()
    setGroups(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createGroup = useCallback(async (data: Omit<Group, 'id'>) => {
    const created = await window.api.groups.create(data)
    setGroups(prev => [...prev, created])
    return created
  }, [])

  const updateGroup = useCallback(async (id: number, data: Partial<Group>) => {
    const updated = await window.api.groups.update(id, data)
    setGroups(prev => prev.map(g => g.id === id ? updated : g))
    return updated
  }, [])

  const deleteGroup = useCallback(async (id: number) => {
    await window.api.groups.delete(id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }, [])

  const moveGroup = useCallback(async (id: number, direction: 'up' | 'down') => {
    const sorted = [...groups].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(g => g.id === id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= sorted.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const a = sorted[idx]
    const b = sorted[swapIdx]

    const newA = { ...a, sort_order: b.sort_order }
    const newB = { ...b, sort_order: a.sort_order }

    await window.api.groups.update(a.id, { sort_order: b.sort_order })
    await window.api.groups.update(b.id, { sort_order: a.sort_order })

    setGroups(prev => prev.map(g => {
      if (g.id === a.id) return newA
      if (g.id === b.id) return newB
      return g
    }))
  }, [groups])

  return { groups, loading, createGroup, updateGroup, deleteGroup, moveGroup, reload: load }
}
