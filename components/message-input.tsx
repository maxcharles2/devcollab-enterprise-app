"use client"

import { useState } from "react"
import { Paperclip, Send, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MessageInputProps {
  placeholder?: string
}

export function MessageInput({ placeholder = "Type a message..." }: MessageInputProps) {
  const [value, setValue] = useState("")

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 py-3">
      <div className="flex items-end gap-2 rounded-lg border border-input bg-background px-3 py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
          <Paperclip className="h-4 w-4" />
          <span className="sr-only">Attach file</span>
        </Button>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={1}
          className="max-h-24 min-h-[32px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
          <Smile className="h-4 w-4" />
          <span className="sr-only">Emoji</span>
        </Button>
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!value.trim()}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      <div className="mt-1.5 flex items-center gap-1 px-1">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground/60">Sam Chen is typing...</span>
      </div>
    </div>
  )
}
