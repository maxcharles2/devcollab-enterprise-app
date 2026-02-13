"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, ChevronLeft, ChevronRight, Clock, X, Loader2, AlertCircle, Check, ChevronsUpDown, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getWeekDays } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8 AM to 6 PM

interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  event_date: string
  start_time: string
  end_time: string
  color: string | null
  created_by: string | null
  participants?: { id: string; name: string; avatar_url: string | null }[]
}

interface Profile {
  id: string
  name: string
  avatar_url: string | null
}

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  color: z.string().optional(),
  participantIds: z.array(z.string()).default([]),
}).refine((data) => {
  if (!data.startTime || !data.endTime) return true
  const [sh, sm] = data.startTime.split(":").map(Number)
  const [eh, em] = data.endTime.split(":").map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em
  return endMins > startMins
}, { message: "End time must be after start time", path: ["endTime"] })

type EventFormValues = z.infer<typeof eventFormSchema>

const EVENT_COLORS = [
  { value: "bg-primary", label: "Primary" },
  { value: "bg-chart-1", label: "Blue" },
  { value: "bg-chart-2", label: "Teal" },
  { value: "bg-chart-3", label: "Purple" },
  { value: "bg-chart-4", label: "Orange" },
  { value: "bg-chart-5", label: "Pink" },
]

function getWeekEndDate(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split("T")[0]
}

function getDefaultDate(weekStart: string): string {
  return weekStart
}

function getDefaultTimes(): { start: string; end: string } {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  const endH = m >= 30 ? h + 1 : h
  const endM = m >= 30 ? 0 : m + 30
  return {
    start,
    end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
  }
}

interface CalendarViewProps {
  currentUserProfileId?: string | null
}

export function CalendarView({ currentUserProfileId }: CalendarViewProps) {
  const [weekStart, setWeekStart] = useState("2026-02-09")
  const [showModal, setShowModal] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfiles, setSelectedProfiles] = useState<Profile[]>([])
  const [participantOpen, setParticipantOpen] = useState(false)
  const [participantSearch, setParticipantSearch] = useState("")
  const days = getWeekDays(weekStart)
  const defaultTimes = getDefaultTimes()

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: getDefaultDate(weekStart),
      startTime: defaultTimes.start,
      endTime: defaultTimes.end,
      color: "bg-primary",
      participantIds: [],
    },
  })

  const selectedParticipantIds = form.watch("participantIds")

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

  const fetchProfiles = useCallback(async (search?: string) => {
    const url = search
      ? `/api/profiles?q=${encodeURIComponent(search)}`
      : "/api/profiles"
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    setProfiles(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    if (showModal) {
      fetchProfiles()
      setSelectedProfiles([])
      setParticipantSearch("")
      if (!editingEventId) {
        form.reset({
          title: "",
          description: "",
          eventDate: getDefaultDate(weekStart),
          startTime: getDefaultTimes().start,
          endTime: getDefaultTimes().end,
          color: "bg-primary",
          participantIds: [],
        })
      }
    }
  }, [showModal, weekStart, editingEventId, fetchProfiles, form])

  async function openEventForEdit(ev: CalendarEvent) {
    try {
      const res = await fetch(`/api/calendar/events/${ev.id}`)
      if (!res.ok) {
        toast.error("Failed to load event")
        return
      }
      const data = await res.json()
      form.reset({
        title: data.title,
        description: data.description ?? "",
        eventDate: data.event_date,
        startTime: data.start_time,
        endTime: data.end_time,
        color: data.color ?? "bg-primary",
        participantIds: (data.participants ?? []).map((p: { id: string }) => p.id),
      })
      setEditingEventId(ev.id)
      setShowModal(true)
    } catch {
      toast.error("Failed to load event")
    }
  }

  function closeModal() {
    setShowModal(false)
    setEditingEventId(null)
  }

  async function onSubmit(values: EventFormValues) {
    try {
      if (editingEventId) {
        const res = await fetch(`/api/calendar/events/${editingEventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            description: values.description || undefined,
            eventDate: values.eventDate,
            startTime: values.startTime,
            endTime: values.endTime,
            color: values.color || undefined,
            participantIds: values.participantIds,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? "Failed to update event")
          return
        }
        toast.success("Meeting updated successfully")
        closeModal()
      } else {
        const res = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            description: values.description || undefined,
            eventDate: values.eventDate,
            startTime: values.startTime,
            endTime: values.endTime,
            color: values.color || undefined,
            participantIds: values.participantIds,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? "Failed to create event")
          return
        }
        toast.success("Meeting scheduled successfully")
        closeModal()
      }
      fetchEvents()
    } catch {
      toast.error(editingEventId ? "Failed to update event" : "Failed to create event")
    }
  }

  function requestDelete(eventId: string) {
    setDeleteTargetId(eventId)
  }

  async function confirmDelete() {
    if (!deleteTargetId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/calendar/events/${deleteTargetId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete event")
        return
      }
      toast.success("Meeting deleted")
      closeModal()
      setDeleteTargetId(null)
      fetchEvents()
    } catch {
      toast.error("Failed to delete event")
    } finally {
      setIsDeleting(false)
    }
  }

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
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingEventId(null); setShowModal(true); }}>
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
                        <button
                          key={ev.id}
                          type="button"
                          className={`absolute inset-x-1 rounded-md ${colorClass} px-1.5 py-1 text-primary-foreground overflow-hidden text-left cursor-pointer hover:opacity-90 transition-opacity`}
                          style={{ top: `${topPx}px`, height: `${Math.max(heightPx, 24)}px` }}
                          onClick={() => openEventForEdit(ev)}
                        >
                          <p className="truncate text-[11px] font-semibold leading-tight">{ev.title}</p>
                          <p className="truncate text-[10px] opacity-80">
                            {ev.start_time} - {ev.end_time}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schedule / Edit Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40">
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground">
                {editingEventId ? "Edit Meeting" : "Schedule Meeting"}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground">Meeting title</FormLabel>
                      <FormControl>
                        <Input placeholder="Sprint retrospective" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground">Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add meeting notes or agenda…" className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-card-foreground">Start time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-card-foreground">End time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground">Color</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_COLORS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="participantIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground">Participants</FormLabel>
                      <Popover open={participantOpen} onOpenChange={setParticipantOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={participantOpen}
                              className="w-full justify-between font-normal"
                            >
                              {field.value.length === 0
                                ? "Select participants…"
                                : `${field.value.length} selected`}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command
                            shouldFilter={false}
                            value={participantSearch}
                            onValueChange={(val) => {
                              setParticipantSearch(val)
                              fetchProfiles(val || undefined)
                            }}
                          >
                            <CommandInput placeholder="Search by name or email…" />
                            <CommandList>
                              <CommandEmpty>No profiles found.</CommandEmpty>
                              <CommandGroup>
                                {profiles.map((p) => {
                                  const isSelected = field.value.includes(p.id)
                                  return (
                                    <CommandItem
                                      key={p.id}
                                      value={p.id}
                                      onSelect={() => {
                                        const next = isSelected
                                          ? field.value.filter((id) => id !== p.id)
                                          : [...field.value, p.id]
                                        field.onChange(next)
                                        if (isSelected) {
                                          setSelectedProfiles((prev) => prev.filter((sp) => sp.id !== p.id))
                                        } else {
                                          setSelectedProfiles((prev) => (prev.some((sp) => sp.id === p.id) ? prev : [...prev, p]))
                                        }
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                      <Avatar className="h-6 w-6 mr-2">
                                        <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                                          {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {p.name}
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {field.value.map((id) => {
                            const p = profiles.find((pr) => pr.id === id) ?? selectedProfiles.find((pr) => pr.id === id)
                            if (!p) return null
                            return (
                              <div
                                key={id}
                                className="flex items-center gap-1 rounded-full bg-muted px-2 py-1"
                              >
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px]">
                                    {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{p.name.split(" ")[0]}</span>
                                <button
                                  type="button"
                                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                  onClick={() => {
                                    field.onChange(field.value.filter((i) => i !== id))
                                    setSelectedProfiles((prev) => prev.filter((sp) => sp.id !== id))
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-2 flex flex-col gap-2">
                  {editingEventId && currentUserProfileId && events.some((e) => e.id === editingEventId && e.created_by === currentUserProfileId) && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full gap-1.5"
                      disabled={isDeleting}
                      onClick={() => requestDelete(editingEventId)}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete Meeting
                    </Button>
                  )}
                  <Button type="submit" className="w-full gap-1.5" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    {editingEventId ? "Update Meeting" : "Book Meeting"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The meeting will be removed from all participants&apos; calendars.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
