"use client"

import { useState, useEffect, useCallback } from "react"
import { Hash, Calendar, Video, Users, ChevronDown, Circle, LogOut, Plus, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useClerk, useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

export type View =
  | { type: "channel"; id: string }
  | { type: "chat"; id: string }
  | { type: "calendar" }
  | { type: "call"; callId?: string }

interface Channel {
  id: string
  name: string
  description?: string | null
}

interface ChatParticipant {
  id: string
  name: string
  avatar_url: string | null
}

interface Chat {
  id: string
  name: string
  isGroup: boolean
  participants: ChatParticipant[]
}

interface Profile {
  id: string
  name: string
  avatar_url: string | null
}

interface AppSidebarProps {
  activeView: View
  onNavigate: (view: View) => void
  channels: Channel[]
  chats: Chat[]
  onStartDM?: (targetUserId: string) => Promise<void>
  currentUserProfileId?: string | null
}

const statusColor: Record<string, string> = {
  online: "text-emerald-400",
  away: "text-amber-400",
  offline: "text-sidebar-foreground/30",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface NewDMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartDM: (targetUserId: string) => Promise<void>
  currentUserProfileId?: string | null
}

function NewDMDialog({ open, onOpenChange, onStartDM, currentUserProfileId }: NewDMDialogProps) {
  const [search, setSearch] = useState("")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)

  const fetchProfiles = useCallback(async (q?: string) => {
    const url = q
      ? `/api/profiles?q=${encodeURIComponent(q)}`
      : "/api/profiles"
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    setProfiles(list)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch("")
      fetchProfiles()
    }
  }, [open, fetchProfiles])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const t = setTimeout(() => {
      fetchProfiles(search || undefined).finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [search, open, fetchProfiles])

  const filteredProfiles = currentUserProfileId
    ? profiles.filter((p) => p.id !== currentUserProfileId)
    : profiles

  async function handleSelectUser(userId: string) {
    setStarting(userId)
    try {
      await onStartDM(userId)
      onOpenChange(false)
    } finally {
      setStarting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>New direct message</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col border-t px-6 pb-6">
          <div className="flex items-center gap-2 border-b px-1 pb-2">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <Command shouldFilter={false} className="mt-2 rounded-lg border">
            <CommandList className="max-h-[240px]">
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  "No users found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredProfiles.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => handleSelectUser(p.id)}
                    disabled={!!starting}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-[10px]">
                        {getInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="ml-2 truncate">{p.name}</span>
                    {starting === p.id && (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AppSidebar({ activeView, onNavigate, channels, chats, onStartDM, currentUserProfileId }: AppSidebarProps) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [newDMOpen, setNewDMOpen] = useState(false)

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* Workspace header */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
          <Hash className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-accent-foreground">DevCollab</span>
          <span className="text-[11px] leading-none text-sidebar-foreground/60">Enterprise Workspace</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        {/* Channels */}
        <div className="mb-1">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Channels
            </span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {channels.map((ch) => {
              const isActive = activeView.type === "channel" && activeView.id === ch.id
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onNavigate({ type: "channel", id: ch.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Hash className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="truncate">{ch.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Direct Messages */}
        <div className="mb-1 mt-3">
          <div className="flex items-center justify-between gap-1 px-2 py-1.5">
            <div className="flex items-center gap-1">
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Direct Messages
              </span>
            </div>
            {onStartDM && (
              <button
                type="button"
                onClick={() => setNewDMOpen(true)}
                className="rounded p-0.5 text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                aria-label="New direct message"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <nav className="flex flex-col gap-0.5">
            {chats.map((chat) => {
              const isActive = activeView.type === "chat" && activeView.id === chat.id
              const otherParticipant = !chat.isGroup
                ? chat.participants.find((p) => p.id !== currentUserProfileId) ?? chat.participants[0]
                : undefined
              const displayName =
                chat.name ?? (otherParticipant?.name ?? "Direct Message")
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => onNavigate({ type: "chat", id: chat.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {chat.isGroup ? (
                    <Users className="h-4 w-4 shrink-0 opacity-60" />
                  ) : (
                    <div className="relative">
                      <Avatar className="h-5 w-5 text-[9px]">
                        <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-[9px]">
                          {otherParticipant ? getInitials(otherParticipant.name) : "??"}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-current",
                          statusColor.offline
                        )}
                      />
                    </div>
                  )}
                  <span className="truncate">{displayName}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Quick actions */}
        <div className="mt-3">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Tools
            </span>
          </div>
          <nav className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => onNavigate({ type: "calendar" })}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                activeView.type === "calendar"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Calendar className="h-4 w-4 shrink-0 opacity-60" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ type: "call" })}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                activeView.type === "call"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Video className="h-4 w-4 shrink-0 opacity-60" />
              <span>Calls</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-3 hover:bg-sidebar-accent/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Account menu"
            >
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {user ? getInitials((`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "U")) : "U"}
                </AvatarFallback>
              </Avatar>
              <Circle className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current", statusColor.online)} />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium text-sidebar-accent-foreground truncate">{user?.fullName ?? "User"}</span>
              <span className="text-[11px] text-sidebar-foreground/60 truncate">{user?.primaryEmailAddress?.emailAddress ?? ""}</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/sign-in" })}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {onStartDM && (
        <NewDMDialog
          open={newDMOpen}
          onOpenChange={setNewDMOpen}
          onStartDM={onStartDM}
          currentUserProfileId={currentUserProfileId}
        />
      )}
    </aside>
  )
}
