"use client"

import React from "react"

import { Search, Bell, Settings, Users, Hash, Calendar, Video, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useClerk, useUser } from "@clerk/nextjs"
import type { View } from "@/components/app-sidebar"

interface Channel {
  id: string
  name: string
  description?: string | null
}

interface Chat {
  id: string
  name: string
  isGroup: boolean
  participants: { id: string; name: string }[]
}

interface TopHeaderProps {
  activeView: View
  channels?: Channel[]
  chats?: Chat[]
  currentUserProfileId?: string | null
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getTitle(
  view: View,
  channels: Channel[],
  chats: Chat[],
  currentUserProfileId?: string | null
): { icon: React.ReactNode; title: string; subtitle?: string } {
  switch (view.type) {
    case "channel": {
      const ch = channels.find((c) => c.id === view.id)
      return {
        icon: <Hash className="h-5 w-5 text-muted-foreground" />,
        title: ch?.name || "Channel",
        subtitle: ch?.description ?? undefined,
      }
    }
    case "chat": {
      const chat = chats.find((c) => c.id === view.id)
      const displayName =
        chat?.name ??
        (!chat?.isGroup && currentUserProfileId
          ? chat?.participants?.find((p) => p.id !== currentUserProfileId)?.name ?? "Direct Message"
          : "Chat")
      return {
        icon: <Users className="h-5 w-5 text-muted-foreground" />,
        title: displayName,
        subtitle: chat?.isGroup ? `${chat.participants.length} members` : undefined,
      }
    }
    case "calendar":
      return { icon: <Calendar className="h-5 w-5 text-muted-foreground" />, title: "Calendar", subtitle: "Schedule and manage meetings" }
    case "call":
      return { icon: <Video className="h-5 w-5 text-muted-foreground" />, title: "Calls", subtitle: "Video and audio meetings" }
  }
}

export function TopHeader({ activeView, channels = [], chats = [], currentUserProfileId }: TopHeaderProps) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { icon, title, subtitle } = getTitle(activeView, channels, chats, currentUserProfileId)

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user ? getInitials((`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "U")) : "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/sign-in" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
