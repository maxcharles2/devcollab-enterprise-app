"use client"

import { useEffect, useState, useCallback } from "react"
import { MessageList } from "@/components/message-list"
import { MessageInput, type PendingAttachment } from "@/components/message-input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiMessage } from "@/lib/types"
import { useRealtimeMessages, type MessageRow } from "@/hooks/use-realtime-messages"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"

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

interface ChatViewProps {
  chatId: string
  chat?: Chat | null
  currentUserProfileId?: string | null
}

const statusColor: Record<string, string> = {
  online: "text-emerald-400",
  away: "text-amber-400",
  offline: "text-muted-foreground/30",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function messageRowToApiMessage(row: MessageRow, participants: ChatParticipant[]): ApiMessage {
  const sender = participants.find((p) => p.id === row.sender_id)
  return {
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    sender: sender
      ? { id: sender.id, name: sender.name, avatar_url: sender.avatar_url }
      : { id: row.sender_id, name: "Unknown", avatar_url: null },
    file_attachment: null,
  }
}

export function ChatView({ chatId, chat, currentUserProfileId }: ChatViewProps) {
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [loading, setLoading] = useState(true)
  const participants = chat?.participants ?? []

  const { typingUsersArray, sendTyping, clearTyping, isAnyoneTyping } = useTypingIndicator(
    chatId,
    currentUserProfileId ?? null,
    participants.find((p) => p.id === currentUserProfileId)?.name ?? null
  )

  useRealtimeMessages(chatId, {
    onInsert: (message) => {
      if (message.sender_id === currentUserProfileId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        const apiMsg = messageRowToApiMessage(message, participants)
        return [...prev, apiMsg]
      })
    },
    onUpdate: (message) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, content: message.content } : m
        )
      )
    },
    onDelete: (oldMessage) => {
      if (oldMessage.id) {
        setMessages((prev) => prev.filter((m) => m.id !== oldMessage.id))
      }
    },
  })

  const typingLabel = isAnyoneTyping
    ? typingUsersArray.map((u) => u.userName).join(", ") +
      (typingUsersArray.length === 1 ? " is" : " are") +
      " typing..."
    : null

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/messages?chatId=${encodeURIComponent(chatId)}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
      } else {
        setMessages([])
      }
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [chatId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const handleSend = useCallback(
    async (content: string, attachment?: PendingAttachment) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, chatId, ...(attachment && { attachment }) }),
      })
      if (!res.ok) {
        throw new Error("Failed to send message")
      }
      clearTyping()
      await fetchMessages()
    },
    [chatId, fetchMessages, clearTyping]
  )

  const handleSendError = useCallback((err: unknown) => {
    console.error("Failed to send message:", err)
  }, [])

  const handleEdit = useCallback(
    async (messageId: string, content: string) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        throw new Error("Failed to edit message")
      }
      await fetchMessages()
    },
    [fetchMessages]
  )

  const handleDelete = useCallback(
    async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error("Failed to delete message")
      }
      await fetchMessages()
    },
    [fetchMessages]
  )

  const displayName =
    chat?.name ??
    (!chat?.isGroup && currentUserProfileId
      ? participants.find((p) => p.id !== currentUserProfileId)?.name ?? "Direct Message"
      : "Chat")

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Participant bar */}
      {chat && (
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
          <div className="flex -space-x-2">
            {participants.slice(0, 4).map((p) => (
              <Avatar key={p.id} className="h-7 w-7 border-2 border-card">
                {p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}
                <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                  {getInitials(p.name)}
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
            <span className="text-sm font-medium text-card-foreground">{displayName}</span>
            <div className="flex items-center gap-1">
              {!chat.isGroup && participants[0] && (
                <>
                  <Circle className={cn("h-2 w-2 fill-current", statusColor.offline)} />
                  <span className="text-[11px] text-muted-foreground capitalize">offline</span>
                </>
              )}
              {chat.isGroup && (
                <span className="text-[11px] text-muted-foreground">{chat.participants.length} members</span>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserProfileId={currentUserProfileId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      <MessageInput
        placeholder={chat ? `Message ${displayName}...` : "Type a message..."}
        onSend={handleSend}
        onError={handleSendError}
        onTyping={sendTyping}
        onClearTyping={clearTyping}
        typingLabel={typingLabel}
      />
    </div>
  )
}
