"use client"

import { chatMessages, chats, users, currentUser } from "@/lib/mock-data"
import { MessageList } from "@/components/message-list"
import { MessageInput } from "@/components/message-input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatViewProps {
  chatId: string
}

const statusColor: Record<string, string> = {
  online: "text-emerald-400",
  away: "text-amber-400",
  offline: "text-muted-foreground/30",
}

export function ChatView({ chatId }: ChatViewProps) {
  const chat = chats.find((c) => c.id === chatId)
  const messages = chatMessages[chatId] || []

  if (!chat) return null

  const participants = chat.participants
    .filter((pid) => pid !== currentUser.id)
    .map((pid) => users.find((u) => u.id === pid))
    .filter(Boolean)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Participant bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
        <div className="flex -space-x-2">
          {participants.slice(0, 4).map((u) => (
            <Avatar key={u!.id} className="h-7 w-7 border-2 border-card">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                {u!.avatar}
              </AvatarFallback>
            </Avatar>
          ))}
          {participants.length > 4 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
              +{participants.length - 4}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-card-foreground">{chat.name}</span>
          <div className="flex items-center gap-1">
            {!chat.isGroup && participants[0] && (
              <>
                <Circle className={cn("h-2 w-2 fill-current", statusColor[participants[0].status])} />
                <span className="text-[11px] text-muted-foreground capitalize">{participants[0].status}</span>
              </>
            )}
            {chat.isGroup && (
              <span className="text-[11px] text-muted-foreground">{chat.participants.length} members</span>
            )}
          </div>
        </div>
      </div>

      <MessageList messages={messages} />
      <MessageInput placeholder={`Message ${chat.name}...`} />
    </div>
  )
}
