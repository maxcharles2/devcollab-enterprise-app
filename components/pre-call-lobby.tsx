"use client"

import { useEffect, useCallback, useState } from "react"
import { useDaily, DailyVideo, useLocalSessionId } from "@daily-co/daily-react"
import { Video, VideoOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PreCallControls } from "@/components/call-controls"
import { cn } from "@/lib/utils"

/**
 * User info for displaying participant badges
 */
export interface ParticipantPreview {
  id: string
  name: string
  avatarUrl?: string | null
}

/**
 * Props for the PreCallLobby component
 */
export interface PreCallLobbyProps {
  /** Title for the call */
  callTitle?: string
  /** Participants who will be in the call */
  participants?: ParticipantPreview[]
  /** Whether to show a loading state */
  isLoading?: boolean
  /** Loading message to display */
  loadingMessage?: string
  /** Callback when user is ready to join */
  onJoin: (options: { startVideoOff: boolean; startAudioOff: boolean }) => void
  /** Callback when user cancels */
  onCancel: () => void
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
 * PreCallLobby provides a lobby experience before joining a call.
 * 
 * Features:
 * - Camera preview with local video
 * - Audio/video toggle controls
 * - Display of participants who will be in the call
 * - Join and Cancel buttons
 * 
 * Must be used within a DailyProvider component.
 * 
 * @example
 * ```tsx
 * <DailyProvider>
 *   <PreCallLobby
 *     callTitle="Sprint Planning"
 *     participants={[{ id: '1', name: 'Alice' }]}
 *     onJoin={(opts) => handleJoinCall(opts)}
 *     onCancel={() => setShowLobby(false)}
 *   />
 * </DailyProvider>
 * ```
 */
export function PreCallLobby({
  callTitle,
  participants = [],
  isLoading = false,
  loadingMessage = "Preparing call...",
  onJoin,
  onCancel,
  className,
}: PreCallLobbyProps) {
  const dailyCall = useDaily()
  const localSessionId = useLocalSessionId()
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Start camera for preview
  useEffect(() => {
    if (!dailyCall || cameraStarted) return

    const startCamera = async () => {
      try {
        await dailyCall.startCamera({
          startVideoOff: false,
          startAudioOff: false,
        })
        setCameraStarted(true)
        setCameraError(null)
      } catch (error) {
        console.error("[PreCallLobby] Failed to start camera:", error)
        setCameraError(
          error instanceof Error 
            ? error.message 
            : "Could not access camera. Please check permissions."
        )
      }
    }

    startCamera()
  }, [dailyCall, cameraStarted])

  // Toggle video preview
  const toggleVideo = useCallback(() => {
    if (!dailyCall) return
    const newState = !isVideoEnabled
    dailyCall.setLocalVideo(newState)
    setIsVideoEnabled(newState)
  }, [dailyCall, isVideoEnabled])

  // Toggle audio preview
  const toggleAudio = useCallback(() => {
    if (!dailyCall) return
    const newState = !isAudioEnabled
    dailyCall.setLocalAudio(newState)
    setIsAudioEnabled(newState)
  }, [dailyCall, isAudioEnabled])

  // Handle join with current settings
  const handleJoin = useCallback(() => {
    onJoin({
      startVideoOff: !isVideoEnabled,
      startAudioOff: !isAudioEnabled,
    })
  }, [onJoin, isVideoEnabled, isAudioEnabled])

  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-6 px-4", className)}>
      {/* Call title */}
      {callTitle && (
        <h2 className="text-xl font-semibold text-foreground text-center">
          {callTitle}
        </h2>
      )}

      {/* Video preview container */}
      <div className="relative w-full max-w-md aspect-video rounded-lg bg-sidebar overflow-hidden">
        {/* Camera preview */}
        {cameraStarted && isVideoEnabled && localSessionId && (
          <DailyVideo
            sessionId={localSessionId}
            type="video"
            automirror
            className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
          />
        )}

        {/* Camera off state */}
        {(!isVideoEnabled || cameraError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sidebar">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sidebar-accent">
              <VideoOff className="h-10 w-10 text-sidebar-accent-foreground" />
            </div>
            {cameraError ? (
              <p className="text-sm text-destructive text-center max-w-xs px-4">
                {cameraError}
              </p>
            ) : (
              <p className="text-sm text-sidebar-foreground/60">Camera is off</p>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sidebar/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-foreground">{loadingMessage}</p>
          </div>
        )}
      </div>

      {/* Pre-call controls */}
      <PreCallControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        disabled={isLoading}
      />

      {/* Participant preview */}
      {participants.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {participants.length === 1
              ? "1 participant will be invited"
              : `${participants.length} participants will be invited`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {participants.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
              >
                <Avatar className="h-6 w-6">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.name} />}
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                    {getInitials(p.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-card-foreground">
                  {p.name.split(" ")[0]}
                </span>
              </div>
            ))}
            {participants.length > 6 && (
              <span className="text-xs text-muted-foreground">
                +{participants.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="bg-transparent"
        >
          Cancel
        </Button>
        <Button
          onClick={handleJoin}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <Video className="h-4 w-4" />
              Join Call
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Simple loading state for the pre-call lobby
 */
export function PreCallLobbySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-6 px-4", className)}>
      <div className="h-7 w-48 animate-pulse rounded bg-muted" />
      <div className="w-full max-w-md aspect-video rounded-lg bg-sidebar animate-pulse" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-20 animate-pulse rounded bg-muted" />
        <div className="h-10 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
