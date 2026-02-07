"use client"

import { channelMessages } from "@/lib/mock-data"
import { MessageList } from "@/components/message-list"
import { MessageInput } from "@/components/message-input"

interface ChannelViewProps {
  channelId: string
}

export function ChannelView({ channelId }: ChannelViewProps) {
  const messages = channelMessages[channelId] || []

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} />
      <MessageInput placeholder="Message this channel..." />
    </div>
  )
}
