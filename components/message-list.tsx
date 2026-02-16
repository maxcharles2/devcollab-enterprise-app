"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { FilePreviewCard } from "@/components/file-preview-card"
import type { ApiMessage } from "@/lib/types"

interface MessageListProps {
  messages: ApiMessage[]
  currentUserProfileId?: string | null
  onEdit?: (messageId: string, content: string) => Promise<void>
  onDelete?: (messageId: string) => Promise<void>
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday =
    d.toDateString() === new Date(now.getTime() - 86400000).toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (isYesterday) return "Yesterday"
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function MessageList({ messages, currentUserProfileId, onEdit, onDelete }: MessageListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canEdit = Boolean(currentUserProfileId && onEdit)
  const canDelete = Boolean(currentUserProfileId && onDelete)

  const startEditing = (msg: ApiMessage) => {
    setEditingId(msg.id)
    setEditContent(msg.content)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditContent("")
  }

  const saveEdit = async () => {
    if (!editingId || !onEdit || !editContent.trim()) return
    setIsSaving(true)
    try {
      await onEdit(editingId, editContent.trim())
      setEditingId(null)
      setEditContent("")
    } catch (err) {
      console.error("Failed to edit message:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(deleteTargetId)
      setDeleteTargetId(null)
    } catch (err) {
      console.error("Failed to delete message:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs">Be the first to start the conversation.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
      {messages.map((msg) => {
        const sender = msg.sender
        const name = sender?.name ?? "Unknown"
        const initials = sender ? getInitials(sender.name) : "??"
        const avatarUrl = sender?.avatar_url ?? null
        const isOwn = canEdit && sender?.id === currentUserProfileId
        const isEditing = editingId === msg.id

        return (
          <div key={msg.id} className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{name}</span>
                <span className="text-[11px] text-muted-foreground">{formatTimestamp(msg.created_at)}</span>
                {isOwn && isEditing && (
                  <span className="text-[11px] text-muted-foreground">(editing)</span>
                )}
                {isOwn && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="ml-auto rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                        aria-label="Message options"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEditing(msg)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTargetId(msg.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        saveEdit()
                      }
                      if (e.key === "Escape") cancelEditing()
                    }}
                    className="text-sm"
                    disabled={isSaving}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={isSaving || !editContent.trim()}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
                  {msg.file_attachment && (
                    <FilePreviewCard file={msg.file_attachment} />
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-foreground/90">{msg.content}</p>
                  {msg.file_attachment && (
                    <FilePreviewCard file={msg.file_attachment} />
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
