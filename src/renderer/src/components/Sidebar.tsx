import React, { useState } from 'react'
import { Group, GanttEvent } from '../types'

interface Props {
  groups: Group[]
  events: GanttEvent[]
  onEditGroup: (group: Group) => void
  onDeleteGroup: (id: number) => void
  onMoveGroup: (id: number, direction: 'up' | 'down') => void
  onToggleCollapse: (id: number, collapsed: number) => void
  onEditEvent: (event: GanttEvent) => void
  onDeleteEvent: (id: number) => void
  onMoveEvent: (id: number, direction: 'up' | 'down', groupId: number | null) => void
  onAddEventInGroup: (groupId: number | null) => void
}

interface ConfirmState {
  type: 'group' | 'event'
  id: number
  name: string
}

export default function Sidebar({
  groups, events,
  onEditGroup, onDeleteGroup, onMoveGroup, onToggleCollapse,
  onEditEvent, onDeleteEvent, onMoveEvent, onAddEventInGroup
}: Props) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order)
  const ungroupedEvents = [...events]
    .filter(e => e.group_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  const handleDeleteGroup = (g: Group) => {
    setConfirm({ type: 'group', id: g.id, name: g.name })
  }
  const handleDeleteEvent = (e: GanttEvent) => {
    setConfirm({ type: 'event', id: e.id, name: e.name })
  }
  const confirmDelete = () => {
    if (!confirm) return
    if (confirm.type === 'group') onDeleteGroup(confirm.id)
    else onDeleteEvent(confirm.id)
    setConfirm(null)
  }

  const renderEventRow = (ev: GanttEvent, allInGroup: GanttEvent[], idx: number) => (
    <div key={ev.id} className="sidebar-event-row">
      <div className="sidebar-event-name" title={ev.name}>{ev.name}</div>
      <div className="sidebar-row-actions">
        <button className="btn-row-action" title="上移" onClick={() => onMoveEvent(ev.id, 'up', ev.group_id)} disabled={idx === 0}>▲</button>
        <button className="btn-row-action" title="下移" onClick={() => onMoveEvent(ev.id, 'down', ev.group_id)} disabled={idx === allInGroup.length - 1}>▼</button>
        <button className="btn-row-action" title="編輯" onClick={() => onEditEvent(ev)}>✎</button>
        <button className="btn-row-action btn-danger" title="刪除" onClick={() => handleDeleteEvent(ev)}>✕</button>
      </div>
    </div>
  )

  return (
    <div className="sidebar">
      {confirm && (
        <div className="confirm-overlay" onClick={() => setConfirm(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p>確定要刪除「{confirm.name}」嗎？</p>
            {confirm.type === 'group' && <p className="confirm-warning">（群組內的事件將變為未分組）</p>}
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setConfirm(null)}>取消</button>
              <button className="btn btn-danger" onClick={confirmDelete}>刪除</button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-section-header ungrouped-header">
          <span>未分組</span>
          <button className="btn-row-action" title="新增未分組事件" onClick={() => onAddEventInGroup(null)}>+</button>
        </div>
        {ungroupedEvents.map((ev, idx) => renderEventRow(ev, ungroupedEvents, idx))}
      </div>

      {sortedGroups.map((g, gIdx) => {
        const groupEvents = [...events]
          .filter(e => e.group_id === g.id)
          .sort((a, b) => a.sort_order - b.sort_order)
        const isCollapsed = g.collapsed === 1

        return (
          <div key={g.id} className="sidebar-section">
            <div className="sidebar-group-header" style={{ borderLeft: `4px solid ${g.color}` }}>
              <button
                className="collapse-btn"
                onClick={() => onToggleCollapse(g.id, isCollapsed ? 0 : 1)}
                title={isCollapsed ? '展開' : '收合'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
              <span className="sidebar-group-name" title={g.name}>{g.name}</span>
              <div className="sidebar-row-actions">
                <button className="btn-row-action" title="上移群組" onClick={() => onMoveGroup(g.id, 'up')} disabled={gIdx === 0}>▲</button>
                <button className="btn-row-action" title="下移群組" onClick={() => onMoveGroup(g.id, 'down')} disabled={gIdx === sortedGroups.length - 1}>▼</button>
                <button className="btn-row-action" title="新增事件" onClick={() => onAddEventInGroup(g.id)}>+</button>
                <button className="btn-row-action" title="編輯群組" onClick={() => onEditGroup(g)}>✎</button>
                <button className="btn-row-action btn-danger" title="刪除群組" onClick={() => handleDeleteGroup(g)}>✕</button>
              </div>
            </div>
            {!isCollapsed && groupEvents.map((ev, idx) => renderEventRow(ev, groupEvents, idx))}
          </div>
        )
      })}
    </div>
  )
}
