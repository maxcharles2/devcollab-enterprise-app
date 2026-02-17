"use client"

import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorOff, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { DeviceInfo } from "@/hooks/use-daily-call"

/**
 * Props for the CallControls component
 */
export interface CallControlsProps {
  /** Whether local audio is muted */
  isMuted: boolean
  /** Whether local camera is off */
  isCameraOff: boolean
  /** Whether local user is screen sharing */
  isScreenSharing: boolean
  /** Toggle mute state */
  onToggleMute: () => void
  /** Toggle camera state */
  onToggleCamera: () => void
  /** Toggle screen sharing */
  onToggleScreenShare: () => void
  /** Leave the call */
  onLeaveCall: () => void
  /** Available microphones for selection */
  microphones?: DeviceInfo[]
  /** Available cameras for selection */
  cameras?: DeviceInfo[]
  /** Available speakers for selection */
  speakers?: DeviceInfo[]
  /** Currently selected microphone ID */
  currentMicrophoneId?: string | null
  /** Currently selected camera ID */
  currentCameraId?: string | null
  /** Currently selected speaker ID */
  currentSpeakerId?: string | null
  /** Callback to change microphone */
  onMicrophoneChange?: (deviceId: string) => void
  /** Callback to change camera */
  onCameraChange?: (deviceId: string) => void
  /** Callback to change speaker */
  onSpeakerChange?: (deviceId: string) => void
  /** Whether controls are disabled (e.g., during joining/leaving) */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * CallControls displays the call control bar with mute, camera, screen share, and leave buttons.
 * 
 * Features:
 * - Mute/unmute microphone
 * - Toggle camera on/off
 * - Start/stop screen sharing
 * - Leave call button
 * - Device selection dropdowns for advanced settings
 * 
 * @example
 * ```tsx
 * <CallControls
 *   isMuted={isMuted}
 *   isCameraOff={isCameraOff}
 *   isScreenSharing={isScreenSharing}
 *   onToggleMute={toggleMute}
 *   onToggleCamera={toggleCamera}
 *   onToggleScreenShare={toggleScreenShare}
 *   onLeaveCall={handleLeaveCall}
 * />
 * ```
 */
export function CallControls({
  isMuted,
  isCameraOff,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeaveCall,
  microphones = [],
  cameras = [],
  speakers = [],
  currentMicrophoneId,
  currentCameraId,
  currentSpeakerId,
  onMicrophoneChange,
  onCameraChange,
  onSpeakerChange,
  disabled = false,
  className,
}: CallControlsProps) {
  const hasDeviceOptions = microphones.length > 0 || cameras.length > 0 || speakers.length > 0

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center gap-3 border-t border-border bg-card px-4 py-3",
        className
      )}
    >
      {/* Mute button */}
      <Button
        variant={isMuted ? "destructive" : "outline"}
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onToggleMute}
        disabled={disabled}
        title={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
      </Button>

      {/* Camera button */}
      <Button
        variant={isCameraOff ? "destructive" : "outline"}
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onToggleCamera}
        disabled={disabled}
        title={isCameraOff ? "Turn on camera" : "Turn off camera"}
      >
        {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        <span className="sr-only">{isCameraOff ? "Turn on camera" : "Turn off camera"}</span>
      </Button>

      {/* Screen share button */}
      <Button
        variant={isScreenSharing ? "secondary" : "outline"}
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full",
          isScreenSharing && "bg-accent text-accent-foreground hover:bg-accent/90"
        )}
        onClick={onToggleScreenShare}
        disabled={disabled}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
        <span className="sr-only">{isScreenSharing ? "Stop sharing" : "Share screen"}</span>
      </Button>

      {/* Device settings dropdown */}
      {hasDeviceOptions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              disabled={disabled}
              title="Device settings"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Device settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-64">
            {/* Microphone selection */}
            {microphones.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Microphone
                </DropdownMenuLabel>
                {microphones.map((mic) => (
                  <DropdownMenuItem
                    key={mic.deviceId}
                    onClick={() => onMicrophoneChange?.(mic.deviceId)}
                    className={cn(
                      "cursor-pointer",
                      currentMicrophoneId === mic.deviceId && "bg-accent"
                    )}
                  >
                    <Mic className="mr-2 h-3 w-3" />
                    <span className="truncate">{mic.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Camera selection */}
            {cameras.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Camera
                </DropdownMenuLabel>
                {cameras.map((cam) => (
                  <DropdownMenuItem
                    key={cam.deviceId}
                    onClick={() => onCameraChange?.(cam.deviceId)}
                    className={cn(
                      "cursor-pointer",
                      currentCameraId === cam.deviceId && "bg-accent"
                    )}
                  >
                    <Video className="mr-2 h-3 w-3" />
                    <span className="truncate">{cam.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Speaker selection */}
            {speakers.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Speaker
                </DropdownMenuLabel>
                {speakers.map((speaker) => (
                  <DropdownMenuItem
                    key={speaker.deviceId}
                    onClick={() => onSpeakerChange?.(speaker.deviceId)}
                    className={cn(
                      "cursor-pointer",
                      currentSpeakerId === speaker.deviceId && "bg-accent"
                    )}
                  >
                    <span className="mr-2">🔊</span>
                    <span className="truncate">{speaker.label}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Leave call button */}
      <Button
        variant="destructive"
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onLeaveCall}
        disabled={disabled}
        title="Leave call"
      >
        <PhoneOff className="h-4 w-4" />
        <span className="sr-only">Leave call</span>
      </Button>
    </div>
  )
}

/**
 * Simple call controls for pre-call lobby (just mute and camera toggle)
 */
export interface PreCallControlsProps {
  /** Whether audio is enabled */
  isAudioEnabled: boolean
  /** Whether video is enabled */
  isVideoEnabled: boolean
  /** Toggle audio */
  onToggleAudio: () => void
  /** Toggle video */
  onToggleVideo: () => void
  /** Whether controls are disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

export function PreCallControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  disabled = false,
  className,
}: PreCallControlsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <Button
        variant={!isAudioEnabled ? "destructive" : "outline"}
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onToggleAudio}
        disabled={disabled}
        title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        <span className="sr-only">{isAudioEnabled ? "Mute" : "Unmute"}</span>
      </Button>

      <Button
        variant={!isVideoEnabled ? "destructive" : "outline"}
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onToggleVideo}
        disabled={disabled}
        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        <span className="sr-only">{isVideoEnabled ? "Turn off camera" : "Turn on camera"}</span>
      </Button>
    </div>
  )
}
