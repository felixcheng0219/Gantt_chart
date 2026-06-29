import React from 'react'

interface Props {
  currentDate: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onAddEvent: () => void
  onAddGroup: () => void
}

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
}

export default function Toolbar({ currentDate, onPrev, onNext, onToday, onAddEvent, onAddGroup }: Props) {
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
        <span className="view-label">月視圖</span>
      </div>
    </div>
  )
}
