"use client"

import { Hash, MessageSquare, Calendar, Video, Users, ChevronDown, Circle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { channels, chats, currentUser, users } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export type View =
  | { type: "channel"; id: string }
  | { type: "chat"; id: string }
  | { type: "calendar" }
  | { type: "call" }

interface AppSidebarProps {
  activeView: View
  onNavigate: (view: View) => void
}

const statusColor: Record<string, string> = {
  online: "text-emerald-400",
  away: "text-amber-400",
  offline: "text-sidebar-foreground/30",
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
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
                  {ch.unreadCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground">
                      {ch.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Direct Messages */}
        <div className="mb-1 mt-3">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Direct Messages
            </span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {chats.map((chat) => {
              const isActive = activeView.type === "chat" && activeView.id === chat.id
              const otherUser = !chat.isGroup
                ? users.find((u) => chat.participants.find((p) => p !== currentUser.id) === u.id)
                : null
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
                          {otherUser?.avatar || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-current",
                          statusColor[otherUser?.status || "offline"]
                        )}
                      />
                    </div>
                  )}
                  <span className="truncate">{chat.name}</span>
                  {chat.unreadCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground">
                      {chat.unreadCount}
                    </span>
                  )}
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
      <div className="flex items-center gap-2 border-t border-sidebar-border px-3 py-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {currentUser.avatar}
            </AvatarFallback>
          </Avatar>
          <Circle className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current", statusColor[currentUser.status])} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-sidebar-accent-foreground">{currentUser.name}</span>
          <span className="text-[11px] text-sidebar-foreground/60">{currentUser.role}</span>
        </div>
      </div>
    </aside>
  )
}
