"use client"

import { useState } from "react"
import { Plus, ChevronLeft, ChevronRight, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { calendarEvents, getWeekDays, users } from "@/lib/mock-data"

const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8 AM to 6 PM

export function CalendarView() {
  const [weekStart, setWeekStart] = useState("2026-02-09")
  const [showModal, setShowModal] = useState(false)
  const days = getWeekDays(weekStart)

  function shiftWeek(dir: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dir * 7)
    setWeekStart(d.toISOString().split("T")[0])
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Calendar header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous week</span>
          </Button>
          <span className="text-sm font-medium text-card-foreground min-w-32 text-center">
            {days[0]?.dayName} {days[0]?.label} &ndash; {days[6]?.dayName} {days[6]?.label}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next week</span>
          </Button>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          New Meeting
        </Button>
      </div>

      {/* Weekly grid */}
      <div className="flex flex-1 overflow-auto">
        {/* Time gutter */}
        <div className="sticky left-0 z-10 w-16 shrink-0 border-r border-border bg-card">
          <div className="h-10 border-b border-border" />
          {hours.map((h) => (
            <div key={h} className="flex h-16 items-start justify-end border-b border-border pr-2 pt-0.5">
              <span className="text-[11px] text-muted-foreground">
                {h > 12 ? h - 12 : h} {h >= 12 ? "PM" : "AM"}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1">
          {days.map((day) => {
            const dayEvents = calendarEvents.filter((ev) => ev.date === day.date)
            return (
              <div key={day.date} className="flex min-w-28 flex-1 flex-col border-r border-border last:border-r-0">
                {/* Day header */}
                <div className="flex h-10 flex-col items-center justify-center border-b border-border bg-card">
                  <span className="text-[11px] uppercase text-muted-foreground">{day.dayName}</span>
                  <span className="text-xs font-semibold text-card-foreground">{day.label}</span>
                </div>

                {/* Hour cells */}
                <div className="relative">
                  {hours.map((h) => (
                    <div key={h} className="h-16 border-b border-border" />
                  ))}

                  {/* Events */}
                  {dayEvents.map((ev) => {
                    const startH = Number.parseInt(ev.startTime.split(":")[0])
                    const startM = Number.parseInt(ev.startTime.split(":")[1])
                    const endH = Number.parseInt(ev.endTime.split(":")[0])
                    const endM = Number.parseInt(ev.endTime.split(":")[1])
                    const topPx = (startH - 8) * 64 + (startM / 60) * 64
                    const heightPx = ((endH - startH) * 60 + (endM - startM)) / 60 * 64
                    return (
                      <div
                        key={ev.id}
                        className={`absolute inset-x-1 rounded-md ${ev.color} px-1.5 py-1 text-primary-foreground overflow-hidden`}
                        style={{ top: `${topPx}px`, height: `${Math.max(heightPx, 24)}px` }}
                      >
                        <p className="truncate text-[11px] font-semibold leading-tight">{ev.title}</p>
                        <p className="truncate text-[10px] opacity-80">
                          {ev.startTime} - {ev.endTime}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40">
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground">Schedule Meeting</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setShowModal(false) }}>
              <div className="flex flex-col gap-1.5">
                <Label className="text-card-foreground">Meeting title</Label>
                <Input placeholder="Sprint retrospective" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-card-foreground">Date</Label>
                <Input type="date" defaultValue="2026-02-09" />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-card-foreground">Start time</Label>
                  <Input type="time" defaultValue="10:00" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-card-foreground">End time</Label>
                  <Input type="time" defaultValue="11:00" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-card-foreground">Participants</Label>
                <div className="flex flex-wrap gap-1.5">
                  {users.slice(1, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px]">{u.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{u.name.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="mt-2 w-full gap-1.5">
                <Clock className="h-4 w-4" />
                Book Meeting
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
