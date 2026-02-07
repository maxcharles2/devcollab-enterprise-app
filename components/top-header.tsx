"use client"

import React from "react"

import { Search, Bell, Settings, Users, Hash, Calendar, Video } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { View } from "@/components/app-sidebar"
import { channels, chats, users, currentUser } from "@/lib/mock-data"

interface TopHeaderProps {
  activeView: View
}

function getTitle(view: View): { icon: React.ReactNode; title: string; subtitle?: string } {
  switch (view.type) {
    case "channel": {
      const ch = channels.find((c) => c.id === view.id)
      return {
        icon: <Hash className="h-5 w-5 text-muted-foreground" />,
        title: ch?.name || "Channel",
        subtitle: ch?.description,
      }
    }
    case "chat": {
      const chat = chats.find((c) => c.id === view.id)
      return {
        icon: <Users className="h-5 w-5 text-muted-foreground" />,
        title: chat?.name || "Chat",
        subtitle: chat?.isGroup
          ? `${chat.participants.length} members`
          : users.find((u) => u.id === chat?.participants.find((p) => p !== currentUser.id))?.role,
      }
    }
    case "calendar":
      return { icon: <Calendar className="h-5 w-5 text-muted-foreground" />, title: "Calendar", subtitle: "Schedule and manage meetings" }
    case "call":
      return { icon: <Video className="h-5 w-5 text-muted-foreground" />, title: "Calls", subtitle: "Video and audio meetings" }
  }
}

export function TopHeader({ activeView }: TopHeaderProps) {
  const { icon, title, subtitle } = getTitle(activeView)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        {icon}
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold leading-tight text-card-foreground">{title}</h1>
          {subtitle && <p className="text-xs leading-tight text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-8 w-56 bg-secondary pl-8 text-sm"
            readOnly
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {currentUser.avatar}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
