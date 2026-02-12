"use client"

import { useEffect, useState, useCallback } from "react"
import { MessageList } from "@/components/message-list"
import { MessageInput } from "@/components/message-input"
import type { ApiMessage } from "@/lib/types"

interface ChannelViewProps {
  channelId: string
  currentUserProfileId?: string | null
}

export function ChannelView({ channelId, currentUserProfileId }: ChannelViewProps) {
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/messages?channelId=${encodeURIComponent(channelId)}`)
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
  }, [channelId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const handleSend = useCallback(
    async (content: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, channelId }),
      })
      if (!res.ok) {
        throw new Error("Failed to send message")
      }
      await fetchMessages()
    },
    [channelId, fetchMessages]
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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
      <MessageInput placeholder="Message this channel..." onSend={handleSend} onError={handleSendError} />
    </div>
  )
}
