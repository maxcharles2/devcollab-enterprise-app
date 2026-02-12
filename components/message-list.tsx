"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { ApiMessage } from "@/lib/types"

interface MessageListProps {
  messages: ApiMessage[]
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday =
    d.toDateString() === new Date(now.getTime() - 86400000).toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (isYesterday) return "Yesterday"
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs">Be the first to start the conversation.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
      {messages.map((msg) => {
        const sender = msg.sender
        const name = sender?.name ?? "Unknown"
        const initials = sender ? getInitials(sender.name) : "??"
        const avatarUrl = sender?.avatar_url ?? null
        return (
          <div key={msg.id} className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{name}</span>
                <span className="text-[11px] text-muted-foreground">{formatTimestamp(msg.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{msg.content}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
