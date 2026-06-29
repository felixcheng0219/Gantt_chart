import React from 'react'
import { ViewMode } from '../types'

interface Props {
  currentDate: string
  viewMode: ViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (v: ViewMode) => void
  onAddEvent: () => void
  onAddGroup: () => void
}

const VIEW_LABELS: { mode: ViewMode; label: string }[] = [
  { mode: 'day',     label: '日' },
  { mode: 'week',    label: '週' },
  { mode: 'month',   label: '月' },
  { mode: 'quarter', label: '季' },
  { mode: 'year',    label: '年' },
]

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
}

export default function Toolbar({
  currentDate, viewMode,
  onPrev, onNext, onToday, onViewChange,
  onAddEvent, onAddGroup,
}: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn btn-primary" onClick={onAddEvent}>+ 新增事件</button>
        <button className="btn btn-secondary" onClick={onAddGroup}>+ 新增群組</button>
      </div>
      <div className="toolbar-center">
        <button className="btn btn-icon-nav" onClick={onPrev}>‹</button>
        <span className="toolbar-date-label">{formatMonthYear(currentDate)}</span>
        <button className="btn btn-icon-nav" onClick={onNext}>›</button>
        <button className="btn btn-secondary btn-sm" onClick={onToday}>今天</button>
      </div>
      <div className="toolbar-right">
        <div className="view-switcher">
          {VIEW_LABELS.map(({ mode, label }) => (
            <button
              key={mode}
              className={`btn-view${viewMode === mode ? ' active' : ''}`}
              onClick={() => onViewChange(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
