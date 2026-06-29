import React, { useState, useEffect } from 'react'
import { GanttEvent, Group } from '../types'

interface Props {
  event?: GanttEvent | null
  groups: Group[]
  defaultGroupId?: number | null
  onSave: (data: Omit<GanttEvent, 'id'>) => void
  onCancel: () => void
}

function calcDuration(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return diff > 0 ? diff : 1
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days - 1)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function EventForm({ event, groups, defaultGroupId, onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState<string>('')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [durationDays, setDurationDays] = useState(1)
  const [progress, setProgress] = useState(0)
  const [color, setColor] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (event) {
      setName(event.name)
      setGroupId(event.group_id != null ? String(event.group_id) : '')
      setStartDate(event.start_date)
      setEndDate(event.end_date)
      setDurationDays(event.duration_days)
      setProgress(event.progress)
      setColor(event.color ?? '')
      setNotes(event.notes)
    } else {
      setGroupId(defaultGroupId != null ? String(defaultGroupId) : '')
    }
  }, [event, defaultGroupId])

  const handleStartChange = (val: string) => {
    setStartDate(val)
    const dur = calcDuration(val, endDate)
    if (dur < 1) {
      setEndDate(val)
      setDurationDays(1)
    } else {
      setDurationDays(dur)
    }
  }

  const handleEndChange = (val: string) => {
    setEndDate(val)
    setDurationDays(calcDuration(startDate, val))
  }

  const handleDurationChange = (val: number) => {
    const d = val < 1 ? 1 : val
    setDurationDays(d)
    setEndDate(addDays(startDate, d))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      group_id: groupId !== '' ? Number(groupId) : null,
      start_date: startDate,
      end_date: endDate,
      duration_days: durationDays,
      progress,
      notes,
      sort_order: event?.sort_order ?? 0,
      color: color || null
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? '編輯事件' : '新增事件'}</h2>
          <button className="btn-icon" onClick={onCancel}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label>名稱</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="事件名稱"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>群組</label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              onWheel={e => e.stopPropagation()}
            >
              <option value="">無群組（未分組）</option>
              {groups.map(g => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>開始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={e => handleStartChange(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>結束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={e => handleEndChange(e.target.value)}
              />
            </div>
            <div className="form-field form-field-sm">
              <label>天數</label>
              <input
                type="number"
                value={durationDays}
                min={1}
                onChange={e => handleDurationChange(Number(e.target.value))}
                onWheel={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="form-field">
            <label>進度（{progress}%）</label>
            <div className="progress-row">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                onWheel={e => e.stopPropagation()}
                className="range-input"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={e => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                onWheel={e => e.stopPropagation()}
                className="number-input-sm"
              />
            </div>
          </div>
          <div className="form-field">
            <label>顏色（選填，留空使用群組顏色）</label>
            <div className="color-picker-row">
              <input
                type="color"
                value={color || '#4a90d9'}
                onChange={e => setColor(e.target.value)}
                className="color-input"
              />
              {color && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setColor('')}>
                  清除
                </button>
              )}
            </div>
          </div>
          <div className="form-field">
            <label>備註</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="備註..."
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>
  )
}
