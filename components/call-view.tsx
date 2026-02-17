"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { DailyProvider, DailyAudio } from "@daily-co/daily-react"
import {
  Video,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VideoGrid, VideoGridSkeleton, EmptyVideoGrid } from "@/components/video-grid"
import { CallControls } from "@/components/call-controls"
import { PreCallLobby, type ParticipantPreview } from "@/components/pre-call-lobby"
import { useDailyCall } from "@/hooks/use-daily-call"
import { users } from "@/lib/mock-data"
import type { CreateCallResponse, Call } from "@/lib/types"

/**
 * View state for the call flow
 */
type CallViewState = "idle" | "pre-call" | "joining" | "in-call" | "post-call"

/**
 * Call data from API
 */
interface CallData {
  id: string
  roomUrl: string
  token: string
  title?: string
}

/**
 * Error state for the call
 */
interface CallError {
  message: string
  code?: string
}

// Use mock data for participant selection (can be replaced with real data)
const availableParticipants: ParticipantPreview[] = users.slice(0, 6).map((u) => ({
  id: u.id,
  name: u.name,
  avatarUrl: null,
}))

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.split(" ")
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Props for the CallView component
 */
interface CallViewProps {
  /** Optional call ID to join an existing call (e.g., from calendar event) */
  callId?: string
}

/**
 * Main CallView component that orchestrates the call flow.
 * 
 * States:
 * 1. IDLE - Show "Start Call" button
 * 2. PRE_CALL - Lobby with camera preview
 * 3. JOINING - Loading state while connecting
 * 4. IN_CALL - Video grid with controls
 * 5. POST_CALL - Summary view
 */
export function CallView({ callId }: CallViewProps) {
  const [viewState, setViewState] = useState<CallViewState>("idle")
  const [callData, setCallData] = useState<CallData | null>(null)
  const [error, setError] = useState<CallError | null>(null)
  const [selectedParticipants, setSelectedParticipants] = useState<ParticipantPreview[]>(availableParticipants)
  const [callDuration, setCallDuration] = useState<number>(0)
  const [saveCall, setSaveCall] = useState(true)

  // Reset error when view state changes
  useEffect(() => {
    setError(null)
  }, [viewState])

  // Auto-join existing call when callId is provided
  useEffect(() => {
    if (callId && viewState === "idle") {
      handleJoinExisting(callId)
    }
  }, [callId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start call button handler - transitions to pre-call lobby
  const handleStartCall = useCallback(() => {
    setViewState("pre-call")
  }, [])

  // Create call and get token from API
  const createCall = useCallback(async (): Promise<CallData | null> => {
    try {
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Video Call",
          participantIds: selectedParticipants.map((p) => p.id),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to create call: ${response.status}`)
      }

      const data: CreateCallResponse = await response.json()
      return {
        id: data.id,
        roomUrl: data.roomUrl,
        token: data.token,
        title: "Video Call",
      }
    } catch (err) {
      console.error("[CallView] Failed to create call:", err)
      setError({
        message: err instanceof Error ? err.message : "Failed to create call",
        code: "CREATE_CALL_ERROR",
      })
      return null
    }
  }, [selectedParticipants])

  // Join call handler from pre-call lobby
  const handleJoinCall = useCallback(
    async (options: { 
      startVideoOff: boolean
      startAudioOff: boolean
      participants: ParticipantPreview[]
    }) => {
      // Update selected participants from the lobby
      setSelectedParticipants(options.participants)
      setViewState("joining")
      
      // Create the call if we don't have call data yet
      // Use updated participant list for the API call
      try {
        const response = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Video Call",
            participantIds: options.participants.map((p) => p.id),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to create call: ${response.status}`)
        }

        const data: CreateCallResponse = await response.json()
        const newCallData = {
          id: data.id,
          roomUrl: data.roomUrl,
          token: data.token,
          title: "Video Call",
        }
        
        setCallData(newCallData)
        setViewState("in-call")
      } catch (err) {
        console.error("[CallView] Failed to create call:", err)
        setError({
          message: err instanceof Error ? err.message : "Failed to create call",
          code: "CREATE_CALL_ERROR",
        })
        setViewState("idle")
      }
    },
    []
  )

  // Cancel pre-call - go back to idle
  const handleCancelPreCall = useCallback(() => {
    setCallData(null)
    setViewState("idle")
  }, [])

  // Leave call handler
  const handleLeaveCall = useCallback(async () => {
    if (callData) {
      // Notify backend that we're leaving
      try {
        await fetch(`/api/calls/${callData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
        })
      } catch (err) {
        console.error("[CallView] Failed to notify leave:", err)
        // Continue with local leave even if backend fails
      }
    }
    
    setCallDuration(Math.floor(Math.random() * 30) + 10) // Mock duration
    setViewState("post-call")
  }, [callData])

  // Go back to idle from post-call
  const handleBackFromPostCall = useCallback(() => {
    setCallData(null)
    setCallDuration(0)
    setViewState("idle")
  }, [])

  // Handle joining an existing call (could be extended to accept call ID)
  const handleJoinExisting = useCallback(async (callId: string) => {
    setViewState("joining")
    
    try {
      const response = await fetch(`/api/calls/${callId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to join call: ${response.status}`)
      }

      const data = await response.json()
      setCallData({
        id: data.call.id,
        roomUrl: data.roomUrl,
        token: data.token,
        title: data.call.title || "Video Call",
      })
      setViewState("in-call")
    } catch (err) {
      console.error("[CallView] Failed to join existing call:", err)
      setError({
        message: err instanceof Error ? err.message : "Failed to join call",
        code: "JOIN_CALL_ERROR",
      })
      setViewState("idle")
    }
  }, [])

  // Render based on view state
  if (viewState === "post-call") {
    return (
      <PostCallView
        callTitle={callData?.title || "Video Call"}
        duration={callDuration}
        participantCount={selectedParticipants.length}
        saveCall={saveCall}
        setSaveCall={setSaveCall}
        onBack={handleBackFromPostCall}
      />
    )
  }

  if (viewState === "idle") {
    return (
      <IdleView
        participants={selectedParticipants}
        error={error}
        onStartCall={handleStartCall}
        onDismissError={() => setError(null)}
      />
    )
  }

  // Pre-call, joining, and in-call states all need DailyProvider
  return (
    <DailyProvider>
      {viewState === "pre-call" && (
        <PreCallLobby
          callTitle="Video Call"
          participants={selectedParticipants}
          isLoading={false}
          onJoin={handleJoinCall}
          onCancel={handleCancelPreCall}
        />
      )}

      {viewState === "joining" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Connecting to call...</p>
        </div>
      )}

      {viewState === "in-call" && callData && (
        <InCallView
          roomUrl={callData.roomUrl}
          token={callData.token}
          callTitle={callData.title}
          onLeave={handleLeaveCall}
          onError={(err) => {
            setError({ message: err.message })
            setViewState("idle")
          }}
        />
      )}
    </DailyProvider>
  )
}

// ── Idle View ────────────────────────────────────────────────────────────────

interface IdleViewProps {
  participants: ParticipantPreview[]
  error: CallError | null
  onStartCall: () => void
  onDismissError: () => void
}

function IdleView({ participants, error, onStartCall, onDismissError }: IdleViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      {/* Error alert */}
      {error && (
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismissError}
              className="h-auto p-1"
            >
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Video className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Start a Call</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Begin a video or audio call with your team. Supports up to 6 participants.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {participants.map((p) => (
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
      </div>

      <Button className="gap-2" onClick={onStartCall}>
        <Video className="h-4 w-4" />
        Start Call
      </Button>
    </div>
  )
}

// ── In-Call View ─────────────────────────────────────────────────────────────

interface InCallViewProps {
  roomUrl: string
  token: string
  callTitle?: string
  onLeave: () => void
  onError: (error: Error) => void
}

function InCallView({ roomUrl, token, callTitle, onLeave, onError }: InCallViewProps) {
  const {
    callState,
    participants,
    localParticipant,
    isMuted,
    isCameraOff,
    isScreenSharing,
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    microphones,
    cameras,
    speakers,
    currentMicrophoneId,
    currentCameraId,
    currentSpeakerId,
    setMicrophone,
    setCamera,
    setSpeaker,
  } = useDailyCall({
    onError: (error) => {
      console.error("[InCallView] Call error:", error)
      onError(error)
    },
    onLeft: () => {
      console.log("[InCallView] Left the call")
    },
  })

  // Join the call on mount
  useEffect(() => {
    if (callState === "idle") {
      joinCall(roomUrl, token).catch((err) => {
        console.error("[InCallView] Failed to join:", err)
        onError(err instanceof Error ? err : new Error(String(err)))
      })
    }
  }, [callState, joinCall, roomUrl, token, onError])

  // Handle leave
  const handleLeave = useCallback(async () => {
    await leaveCall()
    onLeave()
  }, [leaveCall, onLeave])

  // Show loading state while joining
  if (callState === "idle" || callState === "joining") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-foreground/[0.03]">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Joining call...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (callState === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-medium text-foreground">Connection Error</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Unable to connect to the call. Please check your connection and try again.
        </p>
        <Button variant="outline" onClick={onLeave}>
          Back to Calls
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-foreground/[0.03]">
      {/* Call title bar */}
      {callTitle && (
        <div className="shrink-0 border-b border-border bg-card px-4 py-2">
          <h2 className="text-sm font-medium text-foreground">{callTitle}</h2>
        </div>
      )}

      {/* Video grid */}
      <div className="flex-1 min-h-0">
        {participants.length > 0 ? (
          <VideoGrid participants={participants} allowPinning={true} />
        ) : (
          <EmptyVideoGrid />
        )}
      </div>

      {/* Audio elements for remote participants */}
      <DailyAudio />

      {/* Call controls */}
      <CallControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onLeaveCall={handleLeave}
        microphones={microphones}
        cameras={cameras}
        speakers={speakers}
        currentMicrophoneId={currentMicrophoneId}
        currentCameraId={currentCameraId}
        currentSpeakerId={currentSpeakerId}
        onMicrophoneChange={setMicrophone}
        onCameraChange={setCamera}
        onSpeakerChange={setSpeaker}
        disabled={callState === "leaving"}
      />
    </div>
  )
}

// ── Post-Call View ───────────────────────────────────────────────────────────

interface PostCallViewProps {
  callTitle: string
  duration: number
  participantCount: number
  saveCall: boolean
  setSaveCall: (v: boolean) => void
  onBack: () => void
}

function PostCallView({
  callTitle,
  duration,
  participantCount,
  saveCall,
  setSaveCall,
  onBack,
}: PostCallViewProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-xl font-semibold text-foreground">Call Ended</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {callTitle} &middot; {duration} minutes &middot; {participantCount} participants
        </p>

        {/* Save toggle */}
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-medium text-card-foreground">
              Save this call recording?
            </Label>
            <span className="text-xs text-muted-foreground">
              Recording and transcription will be stored for your team.
            </span>
          </div>
          <Switch checked={saveCall} onCheckedChange={setSaveCall} className="ml-auto" />
        </div>

        {/* Transcription panel */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Transcription</h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Placeholder
            </span>
          </div>
          <div className="flex flex-col gap-3 text-sm text-foreground/80 leading-relaxed">
            <p>
              <span className="font-medium text-foreground">Riley Davis:</span> Alright
              everyone, let&apos;s kick off sprint 14 planning. We have 42 story points to
              allocate.
            </p>
            <p>
              <span className="font-medium text-foreground">Taylor Kim:</span> Backend has 18
              points ready, mostly around the new auth middleware and API caching layer.
            </p>
            <p>
              <span className="font-medium text-foreground">Sam Chen:</span> Frontend is
              looking at 14 points. The dashboard refactor is the big one at 8 points.
            </p>
            <p>
              <span className="font-medium text-foreground">Casey Patel:</span> DevOps has
              about 10 points. We need to finish the CI/CD migration this sprint.
            </p>
            <p>
              <span className="font-medium text-foreground">Riley Davis:</span> That puts us
              right at capacity. Let&apos;s prioritize and finalize after lunch.
            </p>
          </div>
        </div>

        {/* AI summary */}
        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Summary</h3>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Generated
            </span>
          </div>
          <div className="flex flex-col gap-2 text-sm text-foreground/80 leading-relaxed">
            <p>
              The team reviewed sprint 14 capacity (42 story points) and allocated work across
              three tracks:
            </p>
            <ul className="ml-4 flex flex-col gap-1 list-disc">
              <li>
                <span className="font-medium text-foreground">Backend (18 pts):</span> Auth
                middleware refactor, API caching layer implementation
              </li>
              <li>
                <span className="font-medium text-foreground">Frontend (14 pts):</span>{" "}
                Dashboard UI refactor (8 pts), component library updates
              </li>
              <li>
                <span className="font-medium text-foreground">DevOps (10 pts):</span> CI/CD
                pipeline migration, monitoring setup
              </li>
            </ul>
            <p className="mt-1">
              <span className="font-medium text-foreground">Action items:</span> Finalize
              backlog prioritization after lunch, Taylor to create migration plan document.
            </p>
          </div>
        </div>

        <Button variant="outline" className="mt-6 bg-transparent" onClick={onBack}>
          Back to Calls
        </Button>
      </div>
    </div>
  )
}
