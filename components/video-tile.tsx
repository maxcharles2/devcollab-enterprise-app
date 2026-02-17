"use client"

import { useMemo } from "react"
import { DailyVideo } from "@daily-co/daily-react"
import { MicOff, MonitorUp, VideoOff, Pin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { CallParticipantInfo } from "@/hooks/use-daily-call"

/**
 * Props for the VideoTile component
 */
export interface VideoTileProps {
  /** The participant to display */
  participant: CallParticipantInfo
  /** Whether this tile is in a large/featured position */
  isFeatured?: boolean
  /** Whether to show the screen share track instead of camera */
  showScreenShare?: boolean
  /** Whether this participant is pinned */
  isPinned?: boolean
  /** Callback when tile is clicked (for pinning) */
  onClick?: () => void
  /** Additional class names */
  className?: string
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.split(" ")
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * VideoTile displays a single participant's video stream or avatar placeholder.
 * 
 * Features:
 * - Shows video stream when camera is on
 * - Shows avatar fallback when camera is off
 * - Displays mute indicator when audio is muted
 * - Displays screen share indicator when sharing
 * - Shows participant name with "(You)" suffix for local participant
 * - Optional pinned state indicator
 * 
 * @example
 * ```tsx
 * <VideoTile
 *   participant={localParticipant}
 *   isFeatured={true}
 *   onClick={() => handlePin(localParticipant.sessionId)}
 * />
 * ```
 */
export function VideoTile({
  participant,
  isFeatured = false,
  showScreenShare = false,
  isPinned = false,
  onClick,
  className,
}: VideoTileProps) {
  const {
    sessionId,
    userName,
    isLocal,
    isMuted,
    isCameraOff,
    isScreenSharing,
  } = participant

  // Generate avatar initials and color based on name
  const initials = useMemo(() => getInitials(userName), [userName])
  
  // Display name with "(You)" suffix for local participant
  const displayName = isLocal ? `${userName} (You)` : userName

  return (
    <div
      className={cn(
        "video-tile group relative flex items-center justify-center overflow-hidden rounded-lg bg-sidebar transition-all",
        onClick && "cursor-pointer hover:ring-2 hover:ring-primary/50",
        isPinned && "ring-2 ring-primary",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      } : undefined}
      aria-label={onClick ? `${isPinned ? "Unpin" : "Pin"} ${displayName}` : undefined}
    >
      {/* Video or Screen Share */}
      {(!isCameraOff || (showScreenShare && isScreenSharing)) && (
        <DailyVideo
          sessionId={sessionId}
          type={showScreenShare && isScreenSharing ? "screenVideo" : "video"}
          automirror={isLocal && !showScreenShare}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            // Flip local video horizontally for natural mirror effect
            isLocal && !showScreenShare && "scale-x-[-1]"
          )}
        />
      )}

      {/* Avatar fallback when camera is off */}
      {isCameraOff && !showScreenShare && (
        <div className="flex flex-col items-center justify-center gap-3">
          <Avatar className={cn(
            "border-2 border-sidebar-border",
            isFeatured ? "h-24 w-24" : "h-16 w-16"
          )}>
            <AvatarImage src={undefined} alt={userName} />
            <AvatarFallback 
              className={cn(
                "bg-sidebar-accent text-sidebar-accent-foreground",
                isFeatured ? "text-2xl" : "text-xl"
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {isFeatured && (
            <div className="flex items-center gap-2 text-sm text-sidebar-foreground/60">
              <VideoOff className="h-4 w-4" />
              <span>Camera off</span>
            </div>
          )}
        </div>
      )}

      {/* Camera off overlay for non-featured tiles */}
      {isCameraOff && !isFeatured && !showScreenShare && (
        <div className="absolute inset-0 flex items-center justify-center bg-sidebar">
          {/* Avatar is already shown above, this just ensures the bg is solid */}
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-sidebar/80 px-2 py-1 backdrop-blur-sm">
        <span className="text-xs font-medium text-sidebar-accent-foreground truncate max-w-[120px]">
          {displayName}
        </span>
      </div>

      {/* Status indicators (top right) */}
      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        {/* Pinned indicator */}
        {isPinned && (
          <div className="rounded bg-primary/80 p-1 backdrop-blur-sm" title="Pinned">
            <Pin className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
        
        {/* Screen sharing indicator */}
        {isScreenSharing && !showScreenShare && (
          <div className="rounded bg-accent/80 p-1 backdrop-blur-sm" title="Sharing screen">
            <MonitorUp className="h-3 w-3 text-accent-foreground" />
          </div>
        )}

        {/* Muted indicator */}
        {isMuted && (
          <div className="rounded bg-destructive/80 p-1 backdrop-blur-sm" title="Muted">
            <MicOff className="h-3 w-3 text-destructive-foreground" />
          </div>
        )}
      </div>

      {/* Hover overlay for pinning (only if clickable) */}
      {onClick && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-white">
            <Pin className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isPinned ? "Unpin" : "Pin"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * VideoTileSkeleton is a placeholder component for loading states
 */
export function VideoTileSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg bg-sidebar animate-pulse",
        className
      )}
    >
      <div className="h-16 w-16 rounded-full bg-sidebar-accent/50" />
      <div className="absolute bottom-2 left-2 h-5 w-20 rounded bg-sidebar/80" />
    </div>
  )
}
