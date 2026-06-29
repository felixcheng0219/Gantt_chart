import React, { useState, useCallback, useRef } from 'react'
import { Group, GanttEvent } from './types'
import { useGroups } from './hooks/useGroups'
import { useEvents } from './hooks/useEvents'
import { useSettings } from './hooks/useSettings'
import GanttChart from './components/GanttChart'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import EventForm from './components/EventForm'
import GroupForm from './components/GroupForm'

type Modal =
  | { type: 'none' }
  | { type: 'event-create'; defaultGroupId: number | null }
  | { type: 'event-edit'; event: GanttEvent }
  | { type: 'group-create' }
  | { type: 'group-edit'; group: Group }

function getMonthStart(dateStr: string): string {
  return dateStr.slice(0, 7) + '-01'
}

function addMonths(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + delta)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function todayMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export default function App() {
  const { groups, createGroup, updateGroup, deleteGroup, moveGroup } = useGroups()
  const { events, createEvent, updateEvent, deleteEvent, moveEvent } = useEvents()
  const { currentDate, updateCurrentDate } = useSettings()
  const [modal, setModal] = useState<Modal>({ type: 'none' })

  // Auto-save debounce ref for event/group saves (they save immediately via IPC, so no extra debounce needed)
  // The settings hook handles its own debounce

  const handleAddEvent = useCallback(() => {
    setModal({ type: 'event-create', defaultGroupId: null })
  }, [])

  const handleAddEventInGroup = useCallback((groupId: number | null) => {
    setModal({ type: 'event-create', defaultGroupId: groupId })
  }, [])

  const handleEditEvent = useCallback((event: GanttEvent) => {
    setModal({ type: 'event-edit', event })
  }, [])

  const handleAddGroup = useCallback(() => {
    setModal({ type: 'group-create' })
  }, [])

  const handleEditGroup = useCallback((group: Group) => {
    setModal({ type: 'group-edit', group })
  }, [])

  const handleCloseModal = useCallback(() => {
    setModal({ type: 'none' })
  }, [])

  const handleSaveEvent = useCallback(async (data: Omit<GanttEvent, 'id'>) => {
    if (modal.type === 'event-create') {
      // Determine next sort_order for this group
      const groupEvents = events.filter(e => e.group_id === data.group_id)
      const maxOrder = groupEvents.reduce((m, e) => Math.max(m, e.sort_order), -1)
      await createEvent({ ...data, sort_order: maxOrder + 1 })
    } else if (modal.type === 'event-edit') {
      await updateEvent(modal.event.id, data)
    }
    setModal({ type: 'none' })
  }, [modal, events, createEvent, updateEvent])

  const handleSaveGroup = useCallback(async (data: { name: string; color: string }) => {
    if (modal.type === 'group-create') {
      const maxOrder = groups.reduce((m, g) => Math.max(m, g.sort_order), -1)
      await createGroup({ ...data, sort_order: maxOrder + 1, collapsed: 0 })
    } else if (modal.type === 'group-edit') {
      await updateGroup(modal.group.id, data)
    }
    setModal({ type: 'none' })
  }, [modal, groups, createGroup, updateGroup])

  const handleToggleCollapse = useCallback(async (id: number, collapsed: number) => {
    await updateGroup(id, { collapsed })
  }, [updateGroup])

  const handlePrev = useCallback(() => {
    updateCurrentDate(addMonths(currentDate, -1))
  }, [currentDate, updateCurrentDate])

  const handleNext = useCallback(() => {
    updateCurrentDate(addMonths(currentDate, 1))
  }, [currentDate, updateCurrentDate])

  const handleToday = useCallback(() => {
    updateCurrentDate(todayMonthStart())
  }, [updateCurrentDate])

  return (
    <div className="app">
      <Toolbar
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAddEvent={handleAddEvent}
        onAddGroup={handleAddGroup}
      />
      <div className="app-body">
        <Sidebar
          groups={groups}
          events={events}
          onEditGroup={handleEditGroup}
          onDeleteGroup={deleteGroup}
          onMoveGroup={moveGroup}
          onToggleCollapse={handleToggleCollapse}
          onEditEvent={handleEditEvent}
          onDeleteEvent={deleteEvent}
          onMoveEvent={moveEvent}
          onAddEventInGroup={handleAddEventInGroup}
        />
        <div className="gantt-area">
          <GanttChart
            groups={groups}
            events={events}
            currentDate={currentDate}
            onEditEvent={handleEditEvent}
          />
        </div>
      </div>

      {modal.type === 'event-create' && (
        <EventForm
          groups={groups}
          defaultGroupId={modal.defaultGroupId}
          onSave={handleSaveEvent}
          onCancel={handleCloseModal}
        />
      )}
      {modal.type === 'event-edit' && (
        <EventForm
          event={modal.event}
          groups={groups}
          onSave={handleSaveEvent}
          onCancel={handleCloseModal}
        />
      )}
      {modal.type === 'group-create' && (
        <GroupForm
          onSave={handleSaveGroup}
          onCancel={handleCloseModal}
        />
      )}
      {modal.type === 'group-edit' && (
        <GroupForm
          group={modal.group}
          onSave={handleSaveGroup}
          onCancel={handleCloseModal}
        />
      )}
    </div>
  )
}
