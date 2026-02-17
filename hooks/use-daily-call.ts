"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useScreenShare,
  useMeetingState,
  useDevices,
  DailyVideo,
  DailyAudio,
} from "@daily-co/daily-react"
import type {
  DailyParticipant,
  DailyCall,
  DailyEventObjectParticipant,
  DailyMeetingState,
} from "@daily-co/daily-js"

// Re-export components for convenience
export { DailyVideo, DailyAudio }

/**
 * Extended participant info combining Daily's participant data with UI state
 */
export interface CallParticipantInfo {
  /** Daily session ID */
  sessionId: string
  /** User ID (from token) */
  userId: string | undefined
  /** Display name */
  userName: string
  /** Whether this is the local participant */
  isLocal: boolean
  /** Whether the participant's audio is muted */
  isMuted: boolean
  /** Whether the participant's camera is off */
  isCameraOff: boolean
  /** Whether the participant is sharing their screen */
  isScreenSharing: boolean
  /** Whether the participant is the call owner */
  isOwner: boolean
  /** The raw Daily participant object */
  raw: DailyParticipant
}

/**
 * Device information for media selection
 */
export interface DeviceInfo {
  deviceId: string
  label: string
  kind: "audioinput" | "audiooutput" | "videoinput"
}

/**
 * Call state enum matching Daily's meeting states
 */
export type CallState =
  | "idle" // Not joined
  | "joining" // In the process of joining
  | "joined" // Successfully joined
  | "leaving" // In the process of leaving
  | "error" // An error occurred
  | "left" // Left the call

/**
 * Options for the useDailyCall hook
 */
export interface UseDailyCallOptions {
  /**
   * Callback fired when another participant joins the call
   */
  onParticipantJoined?: (participant: CallParticipantInfo) => void
  /**
   * Callback fired when another participant leaves the call
   */
  onParticipantLeft?: (participant: CallParticipantInfo) => void
  /**
   * Callback fired when there's an error
   */
  onError?: (error: Error) => void
  /**
   * Callback fired when successfully joined the call
   */
  onJoined?: () => void
  /**
   * Callback fired when left the call
   */
  onLeft?: () => void
}

/**
 * Return type for the useDailyCall hook
 */
export interface UseDailyCallReturn {
  /** Current call state */
  callState: CallState
  /** List of all participants including local */
  participants: CallParticipantInfo[]
  /** The local participant info (null if not joined) */
  localParticipant: CallParticipantInfo | null
  /** Remote participants only */
  remoteParticipants: CallParticipantInfo[]
  /** Number of participants in the call */
  participantCount: number

  // Local media state
  /** Whether local audio is muted */
  isMuted: boolean
  /** Whether local camera is off */
  isCameraOff: boolean
  /** Whether local user is screen sharing */
  isScreenSharing: boolean

  // Control functions
  /** Join the call with the given room URL and token */
  joinCall: (roomUrl: string, token?: string, userName?: string) => Promise<void>
  /** Leave the current call */
  leaveCall: () => Promise<void>
  /** Toggle local audio mute state */
  toggleMute: () => void
  /** Toggle local camera on/off */
  toggleCamera: () => void
  /** Start screen sharing */
  startScreenShare: () => void
  /** Stop screen sharing */
  stopScreenShare: () => void
  /** Toggle screen sharing */
  toggleScreenShare: () => void

  // Device management
  /** Available microphones */
  microphones: DeviceInfo[]
  /** Available cameras */
  cameras: DeviceInfo[]
  /** Available speakers */
  speakers: DeviceInfo[]
  /** Currently selected microphone ID */
  currentMicrophoneId: string | null
  /** Currently selected camera ID */
  currentCameraId: string | null
  /** Currently selected speaker ID */
  currentSpeakerId: string | null
  /** Set the active microphone */
  setMicrophone: (deviceId: string) => void
  /** Set the active camera */
  setCamera: (deviceId: string) => void
  /** Set the active speaker */
  setSpeaker: (deviceId: string) => void

  // Raw Daily objects for advanced use cases
  /** The Daily call object for advanced operations */
  dailyCall: DailyCall | null
}

/**
 * Convert Daily meeting state to our simplified call state
 */
function toCallState(meetingState: DailyMeetingState | null): CallState {
  switch (meetingState) {
    case "new":
    case "loading":
      return "idle"
    case "joining-meeting":
      return "joining"
    case "joined-meeting":
      return "joined"
    case "leaving-meeting":
      return "leaving"
    case "left-meeting":
      return "left"
    case "error":
      return "error"
    default:
      return "idle"
  }
}

/**
 * Convert a Daily participant to our CallParticipantInfo format
 */
function toParticipantInfo(
  participant: DailyParticipant,
  localSessionId: string | null
): CallParticipantInfo {
  return {
    sessionId: participant.session_id,
    userId: participant.user_id,
    userName: participant.user_name || "Guest",
    isLocal: participant.session_id === localSessionId,
    isMuted: !participant.audio,
    isCameraOff: !participant.video,
    isScreenSharing: !!participant.screen,
    isOwner: participant.owner,
    raw: participant,
  }
}

/**
 * Hook for managing Daily.co video calls.
 *
 * This hook wraps the Daily React SDK and provides a clean API for:
 * - Joining and leaving calls
 * - Managing local audio/video
 * - Screen sharing
 * - Device selection
 * - Tracking participants
 *
 * Must be used within a DailyProvider component.
 *
 * @param options - Callbacks for call events
 * @returns Call state and control functions
 *
 * @example
 * ```tsx
 * function CallView({ roomUrl, token }: { roomUrl: string; token: string }) {
 *   const {
 *     callState,
 *     participants,
 *     localParticipant,
 *     isMuted,
 *     isCameraOff,
 *     toggleMute,
 *     toggleCamera,
 *     joinCall,
 *     leaveCall,
 *   } = useDailyCall({
 *     onParticipantJoined: (p) => console.log(`${p.userName} joined`),
 *     onParticipantLeft: (p) => console.log(`${p.userName} left`),
 *   })
 *
 *   useEffect(() => {
 *     joinCall(roomUrl, token)
 *     return () => { leaveCall() }
 *   }, [roomUrl, token])
 *
 *   return (
 *     <div>
 *       {participants.map((p) => (
 *         <DailyVideo key={p.sessionId} sessionId={p.sessionId} />
 *       ))}
 *       <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
 *       <button onClick={toggleCamera}>{isCameraOff ? "Camera On" : "Camera Off"}</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useDailyCall(
  options: UseDailyCallOptions = {}
): UseDailyCallReturn {
  const dailyCall = useDaily()
  const localSessionId = useLocalSessionId()
  const participantIds = useParticipantIds()
  const meetingState = useMeetingState()
  const { startScreenShare, stopScreenShare, isSharingScreen } = useScreenShare()
  const {
    microphones,
    cameras,
    speakers,
    setMicrophone,
    setCamera,
    setSpeaker,
    currentMic,
    currentCam,
    currentSpeaker,
  } = useDevices()

  // Local state for tracking our mute/camera state
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)

  // Build participant info list
  const participants = useMemo<CallParticipantInfo[]>(() => {
    if (!dailyCall || !participantIds.length) return []

    const allParticipants = dailyCall.participants()
    return participantIds
      .map((id) => allParticipants[id])
      .filter(Boolean)
      .map((p) => toParticipantInfo(p, localSessionId))
  }, [dailyCall, participantIds, localSessionId])

  // Get local participant
  const localParticipant = useMemo(() => {
    return participants.find((p) => p.isLocal) ?? null
  }, [participants])

  // Get remote participants
  const remoteParticipants = useMemo(() => {
    return participants.filter((p) => !p.isLocal)
  }, [participants])

  // Convert meeting state
  const callState = toCallState(meetingState)

  // Set up event listeners for participant join/leave
  useEffect(() => {
    if (!dailyCall) return

    const handleParticipantJoined = (event: DailyEventObjectParticipant | undefined) => {
      if (!event?.participant) return
      // Don't fire for local participant
      if (event.participant.local) return

      const info = toParticipantInfo(event.participant, localSessionId)
      options.onParticipantJoined?.(info)
    }

    const handleParticipantLeft = (event: DailyEventObjectParticipant | undefined) => {
      if (!event?.participant) return
      // Don't fire for local participant
      if (event.participant.local) return

      const info = toParticipantInfo(event.participant, localSessionId)
      options.onParticipantLeft?.(info)
    }

    const handleJoinedMeeting = () => {
      options.onJoined?.()
    }

    const handleLeftMeeting = () => {
      options.onLeft?.()
    }

    const handleError = (event: { errorMsg?: string } | undefined) => {
      options.onError?.(new Error(event?.errorMsg || "Unknown Daily error"))
    }

    dailyCall.on("participant-joined", handleParticipantJoined)
    dailyCall.on("participant-left", handleParticipantLeft)
    dailyCall.on("joined-meeting", handleJoinedMeeting)
    dailyCall.on("left-meeting", handleLeftMeeting)
    dailyCall.on("error", handleError)

    return () => {
      dailyCall.off("participant-joined", handleParticipantJoined)
      dailyCall.off("participant-left", handleParticipantLeft)
      dailyCall.off("joined-meeting", handleJoinedMeeting)
      dailyCall.off("left-meeting", handleLeftMeeting)
      dailyCall.off("error", handleError)
    }
  }, [dailyCall, localSessionId, options])

  // Sync local participant state with actual Daily state
  useEffect(() => {
    if (localParticipant) {
      setIsMuted(localParticipant.isMuted)
      setIsCameraOff(localParticipant.isCameraOff)
    }
  }, [localParticipant])

  // Join call function
  const joinCall = useCallback(
    async (roomUrl: string, token?: string, userName?: string) => {
      if (!dailyCall) {
        throw new Error("Daily call object not initialized. Make sure to wrap your component with DailyProvider.")
      }

      try {
        await dailyCall.join({
          url: roomUrl,
          token,
          userName,
          startVideoOff: false,
          startAudioOff: false,
        })
      } catch (error) {
        console.error("[Daily] Failed to join call:", error)
        options.onError?.(error instanceof Error ? error : new Error(String(error)))
        throw error
      }
    },
    [dailyCall, options]
  )

  // Leave call function
  const leaveCall = useCallback(async () => {
    if (!dailyCall) return

    try {
      await dailyCall.leave()
    } catch (error) {
      console.error("[Daily] Failed to leave call:", error)
      // Don't throw on leave errors - we're leaving anyway
    }
  }, [dailyCall])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!dailyCall) return

    const newMutedState = !isMuted
    dailyCall.setLocalAudio(!newMutedState)
    setIsMuted(newMutedState)
  }, [dailyCall, isMuted])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (!dailyCall) return

    const newCameraOffState = !isCameraOff
    dailyCall.setLocalVideo(!newCameraOffState)
    setIsCameraOff(newCameraOffState)
  }, [dailyCall, isCameraOff])

  // Toggle screen share
  const toggleScreenShare = useCallback(() => {
    if (isSharingScreen) {
      stopScreenShare()
    } else {
      startScreenShare()
    }
  }, [isSharingScreen, startScreenShare, stopScreenShare])

  // Format devices for consistent interface
  const formattedMicrophones = useMemo<DeviceInfo[]>(() => {
    return microphones.map((d) => ({
      deviceId: d.device.deviceId,
      label: d.device.label || `Microphone ${d.device.deviceId.slice(0, 8)}`,
      kind: "audioinput" as const,
    }))
  }, [microphones])

  const formattedCameras = useMemo<DeviceInfo[]>(() => {
    return cameras.map((d) => ({
      deviceId: d.device.deviceId,
      label: d.device.label || `Camera ${d.device.deviceId.slice(0, 8)}`,
      kind: "videoinput" as const,
    }))
  }, [cameras])

  const formattedSpeakers = useMemo<DeviceInfo[]>(() => {
    return speakers.map((d) => ({
      deviceId: d.device.deviceId,
      label: d.device.label || `Speaker ${d.device.deviceId.slice(0, 8)}`,
      kind: "audiooutput" as const,
    }))
  }, [speakers])

  return {
    // Call state
    callState,
    participants,
    localParticipant,
    remoteParticipants,
    participantCount: participants.length,

    // Local media state
    isMuted,
    isCameraOff,
    isScreenSharing: isSharingScreen,

    // Control functions
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,

    // Device management
    microphones: formattedMicrophones,
    cameras: formattedCameras,
    speakers: formattedSpeakers,
    currentMicrophoneId: currentMic?.device.deviceId ?? null,
    currentCameraId: currentCam?.device.deviceId ?? null,
    currentSpeakerId: currentSpeaker?.device.deviceId ?? null,
    setMicrophone: (deviceId: string) => setMicrophone(deviceId),
    setCamera: (deviceId: string) => setCamera(deviceId),
    setSpeaker: (deviceId: string) => setSpeaker(deviceId),

    // Raw Daily object
    dailyCall,
  }
}

/**
 * Hook to get a single participant's info by session ID.
 * Useful for rendering individual video tiles.
 *
 * @param sessionId - The Daily session ID of the participant
 * @returns Participant info or null if not found
 */
export function useDailyParticipant(
  sessionId: string | null
): CallParticipantInfo | null {
  const dailyCall = useDaily()
  const localSessionId = useLocalSessionId()
  const [participant, setParticipant] = useState<CallParticipantInfo | null>(null)

  useEffect(() => {
    if (!dailyCall || !sessionId) {
      setParticipant(null)
      return
    }

    const updateParticipant = () => {
      const participants = dailyCall.participants()
      const p = participants[sessionId]
      if (p) {
        setParticipant(toParticipantInfo(p, localSessionId))
      } else {
        setParticipant(null)
      }
    }

    // Initial update
    updateParticipant()

    // Listen for participant updates
    const handleUpdate = (event: DailyEventObjectParticipant | undefined) => {
      if (event?.participant?.session_id === sessionId) {
        updateParticipant()
      }
    }

    dailyCall.on("participant-updated", handleUpdate)
    dailyCall.on("participant-joined", handleUpdate)

    return () => {
      dailyCall.off("participant-updated", handleUpdate)
      dailyCall.off("participant-joined", handleUpdate)
    }
  }, [dailyCall, sessionId, localSessionId])

  return participant
}

/**
 * Hook to access local video preview before joining a call.
 * Use with DailyProvider's "preAuth" state for pre-call lobbies.
 *
 * @returns Functions to control local preview
 */
export function useDailyPreview() {
  const dailyCall = useDaily()
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)

  const startCamera = useCallback(async () => {
    if (!dailyCall) return
    await dailyCall.startCamera()
    setIsVideoEnabled(true)
    setIsAudioEnabled(true)
  }, [dailyCall])

  const toggleVideo = useCallback(() => {
    if (!dailyCall) return
    const newState = !isVideoEnabled
    dailyCall.setLocalVideo(newState)
    setIsVideoEnabled(newState)
  }, [dailyCall, isVideoEnabled])

  const toggleAudio = useCallback(() => {
    if (!dailyCall) return
    const newState = !isAudioEnabled
    dailyCall.setLocalAudio(newState)
    setIsAudioEnabled(newState)
  }, [dailyCall, isAudioEnabled])

  return {
    startCamera,
    toggleVideo,
    toggleAudio,
    isVideoEnabled,
    isAudioEnabled,
    dailyCall,
  }
}
