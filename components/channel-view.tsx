"use client"

import { useEffect, useState, useCallback } from "react"
import { MessageList } from "@/components/message-list"
import { MessageInput } from "@/components/message-input"
import type { ApiMessage } from "@/lib/types"

interface ChannelViewProps {
  channelId: string
}

export function ChannelView({ channelId }: ChannelViewProps) {
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : (
        <MessageList messages={messages} />
      )}
      <MessageInput placeholder="Message this channel..." onSend={handleSend} onError={handleSendError} />
    </div>
  )
}
