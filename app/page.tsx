"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { AppSidebar, type View } from "@/components/app-sidebar"
import { TopHeader } from "@/components/top-header"
import { ChannelView } from "@/components/channel-view"
import { ChatView } from "@/components/chat-view"
import { CalendarView } from "@/components/calendar-view"
import { CallView } from "@/components/call-view"

export default function Page() {
  const { isLoaded } = useAuth()
  const [activeView, setActiveView] = useState<View>({ type: "channel", id: "ch1" })

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sidebar-border border-t-sidebar-accent-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader activeView={activeView} />
        <main className="flex flex-1 overflow-hidden">
          {activeView.type === "channel" && <ChannelView channelId={activeView.id} />}
          {activeView.type === "chat" && <ChatView chatId={activeView.id} />}
          {activeView.type === "calendar" && <CalendarView />}
          {activeView.type === "call" && <CallView />}
        </main>
      </div>
    </div>
  )
}
