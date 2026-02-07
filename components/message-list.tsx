"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { users } from "@/lib/mock-data"
import type { Message } from "@/lib/mock-data"
import { FilePreviewCard } from "@/components/file-preview-card"

interface MessageListProps {
  messages: Message[]
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
        const sender = users.find((u) => u.id === msg.senderId)
        return (
          <div key={msg.id} className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {sender?.avatar || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{sender?.name || "Unknown"}</span>
                <span className="text-[11px] text-muted-foreground">{msg.timestamp}</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{msg.content}</p>
              {msg.file && <FilePreviewCard file={msg.file} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
