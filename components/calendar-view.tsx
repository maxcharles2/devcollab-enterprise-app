"use client"

import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, Clock, X, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getWeekDays, users } from "@/lib/mock-data"

const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8 AM to 6 PM

interface CalendarEvent {
  id: string
  title: string
  event_date: string
  start_time: string
  end_time: string
  color: string | null
  participants?: { id: string; name: string; avatar_url: string | null }[]
}

function getWeekEndDate(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split("T")[0]
}

export function CalendarView() {
  const [weekStart, setWeekStart] = useState("2026-02-09")
  const [showModal, setShowModal] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const days = getWeekDays(weekStart)

  function fetchEvents() {
    setLoading(true)
    setError(null)
    const startDate = weekStart
    const endDate = getWeekEndDate(weekStart)
    const url = `/api/calendar/events?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Please sign in to view calendar events.")
          if (res.status >= 500) throw new Error("Failed to load events. Please try again.")
          throw new Error("Something went wrong.")
        }
        return res.json()
      })
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load events"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const startDate = weekStart
    const endDate = getWeekEndDate(weekStart)
    const url = `/api/calendar/events?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Please sign in to view calendar events.")
          if (res.status >= 500) throw new Error("Failed to load events. Please try again.")
          throw new Error("Something went wrong.")
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load events")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [weekStart])

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

      {/* Loading state */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Loading events…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <span className="text-sm">{error}</span>
            <Button variant="outline" size="sm" onClick={fetchEvents}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Weekly grid */}
      {!loading && !error && (
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
              const dayEvents = events.filter((ev) => ev.event_date === day.date)
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
                      const startH = Number.parseInt(ev.start_time.split(":")[0])
                      const startM = Number.parseInt(ev.start_time.split(":")[1] || "0")
                      const endH = Number.parseInt(ev.end_time.split(":")[0])
                      const endM = Number.parseInt(ev.end_time.split(":")[1] || "0")
                      const topPx = (startH - 8) * 64 + (startM / 60) * 64
                      const heightPx = ((endH - startH) * 60 + (endM - startM)) / 60 * 64
                      const colorClass = ev.color || "bg-primary"
                      return (
                        <div
                          key={ev.id}
                          className={`absolute inset-x-1 rounded-md ${colorClass} px-1.5 py-1 text-primary-foreground overflow-hidden`}
                          style={{ top: `${topPx}px`, height: `${Math.max(heightPx, 24)}px` }}
                        >
                          <p className="truncate text-[11px] font-semibold leading-tight">{ev.title}</p>
                          <p className="truncate text-[10px] opacity-80">
                            {ev.start_time} - {ev.end_time}
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
      )}

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
