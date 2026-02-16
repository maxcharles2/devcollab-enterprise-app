"use client"

import { useState, useRef } from "react"
import { Paperclip, Send, Smile, X, Loader2, FileText, ImageIcon, FileSpreadsheet, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface PendingAttachment {
  storagePath: string
  name: string
  type: "image" | "doc" | "pdf" | "pptx" | "xlsx"
  size: string
}

interface MessageInputProps {
  placeholder?: string
  onSend?: (content: string, attachment?: PendingAttachment) => void | Promise<void>
  onError?: (error: unknown) => void
}

const fileIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-5 w-5 text-primary" />,
  doc: <FileText className="h-5 w-5 text-primary" />,
  pdf: <FileText className="h-5 w-5 text-destructive" />,
  pptx: <Presentation className="h-5 w-5 text-chart-2" />,
  xlsx: <FileSpreadsheet className="h-5 w-5 text-chart-2" />,
}

export function MessageInput({ placeholder = "Type a message...", onSend, onError }: MessageInputProps) {
  const [value, setValue] = useState("")
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    const trimmed = value.trim()
    if ((!trimmed && !pendingAttachment) || !onSend) return
    try {
      await onSend(trimmed || "", pendingAttachment ?? undefined)
      setValue("")
      setPendingAttachment(null)
    } catch (err) {
      onError?.(err)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to upload file")
      }
      const data = await res.json()
      setPendingAttachment({
        storagePath: data.storagePath,
        name: data.name,
        type: data.type,
        size: data.size,
      })
    } catch (err) {
      onError?.(err)
    } finally {
      setUploading(false)
    }
  }

  const canSend = value.trim() || pendingAttachment

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 py-3">
      {pendingAttachment && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3 max-w-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            {fileIcons[pendingAttachment.type] ?? <FileText className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-card-foreground">{pendingAttachment.name}</span>
            <span className="text-[11px] text-muted-foreground uppercase">
              {pendingAttachment.type} &middot; {pendingAttachment.size}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setPendingAttachment(null)}
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-lg border border-input bg-background px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.pptx,.xlsx"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach file"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          <span className="sr-only">Attach file</span>
        </Button>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="max-h-24 min-h-[32px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
          <Smile className="h-4 w-4" />
          <span className="sr-only">Emoji</span>
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!canSend}
          onClick={handleSend}
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
