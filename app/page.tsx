"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { AppSidebar, type View } from "@/components/app-sidebar"
import { TopHeader } from "@/components/top-header"
import { ChannelView } from "@/components/channel-view"
import { ChatView } from "@/components/chat-view"
import { CalendarView } from "@/components/calendar-view"
import { CallView } from "@/components/call-view"

interface Channel {
  id: string
  name: string
  description: string | null
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

export default function Page() {
  const { isLoaded } = useAuth()
  const [activeView, setActiveView] = useState<View>({ type: "channel", id: "" })
  const [channels, setChannels] = useState<Channel[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((data) => setChannels(Array.isArray(data) ? data : []))
      .catch(() => setChannels([]))
  }, [])

  useEffect(() => {
    fetch("/api/chats")
      .then((r) => r.json())
      .then((data) => setChats(Array.isArray(data) ? data : []))
      .catch(() => setChats([]))
  }, [])

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setCurrentUserProfileId(data?.id ?? null))
      .catch(() => setCurrentUserProfileId(null))
  }, [])

  useEffect(() => {
    if (channels.length > 0 && activeView.type === "channel" && !activeView.id) {
      setActiveView({ type: "channel", id: channels[0].id })
    }
  }, [channels, activeView.type, activeView.type === "channel" || activeView.type === "chat" ? activeView.id : ""])

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sidebar-border border-t-sidebar-accent-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        activeView={activeView}
        onNavigate={setActiveView}
        channels={channels}
        chats={chats}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader activeView={activeView} channels={channels} chats={chats} />
        <main className="flex flex-1 overflow-hidden">
          {activeView.type === "channel" && activeView.id && (
            <ChannelView channelId={activeView.id} currentUserProfileId={currentUserProfileId} />
          )}
          {activeView.type === "chat" && activeView.id && (
            <ChatView
              chatId={activeView.id}
              chat={chats.find((c) => c.id === activeView.id)}
              currentUserProfileId={currentUserProfileId}
            />
          )}
          {activeView.type === "calendar" && <CalendarView currentUserProfileId={currentUserProfileId} />}
          {activeView.type === "call" && <CallView />}
        </main>
      </div>
    </div>
  )
}
