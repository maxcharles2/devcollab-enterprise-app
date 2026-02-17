"use client"

import { useEffect, useCallback, useState, useMemo } from "react"
import { useDaily, DailyVideo, useLocalSessionId, useDevices } from "@daily-co/daily-react"
import {
  Video,
  VideoOff,
  Loader2,
  Mic,
  Speaker,
  X,
  Check,
  Search,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
 * Profile data from API
 */
interface ProfileData {
  id: string
  name: string
  avatar_url: string | null
}

/**
 * Props for the PreCallLobby component
 */
export interface PreCallLobbyProps {
  /** Title for the call */
  callTitle?: string
  /** Initial participants who will be in the call */
  participants?: ParticipantPreview[]
  /** Whether to show a loading state */
  isLoading?: boolean
  /** Loading message to display */
  loadingMessage?: string
  /** Callback when user is ready to join */
  onJoin: (options: {
    startVideoOff: boolean
    startAudioOff: boolean
    participants: ParticipantPreview[]
  }) => void
  /** Callback when user cancels */
  onCancel: () => void
  /** Whether to show the participant picker (defaults to true) */
  showParticipantPicker?: boolean
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
 * - Device selection (microphone, camera, speaker)
 * - Participant picker to add/remove participants
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
  participants: initialParticipants = [],
  isLoading = false,
  loadingMessage = "Preparing call...",
  onJoin,
  onCancel,
  showParticipantPicker = true,
  className,
}: PreCallLobbyProps) {
  const dailyCall = useDaily()
  const localSessionId = useLocalSessionId()
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

  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Participant picker state
  const [selectedParticipants, setSelectedParticipants] = useState<ParticipantPreview[]>(initialParticipants)
  const [participantSearchOpen, setParticipantSearchOpen] = useState(false)
  const [participantSearch, setParticipantSearch] = useState("")
  const [availableProfiles, setAvailableProfiles] = useState<ProfileData[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)

  // Format device lists
  const formattedMicrophones = useMemo(() => {
    return microphones.map((d) => ({
      deviceId: d.device.deviceId,
      label: d.device.label || `Microphone ${d.device.deviceId.slice(0, 8)}`,
    }))
  }, [microphones])

  const formattedCameras = useMemo(() => {
    return cameras.map((d) => ({
      deviceId: d.device.deviceId,
      label: d.device.label || `Camera ${d.device.deviceId.slice(0, 8)}`,
    }))
  }, [cameras])

  const formattedSpeakers = useMemo(() => {
    return speakers.map((d) => ({
      deviceId: d.device.deviceId,
      label: d.device.label || `Speaker ${d.device.deviceId.slice(0, 8)}`,
    }))
  }, [speakers])

  // Fetch profiles for participant picker
  const fetchProfiles = useCallback(async (query?: string) => {
    setIsLoadingProfiles(true)
    try {
      const url = query ? `/api/profiles?q=${encodeURIComponent(query)}` : "/api/profiles"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAvailableProfiles(data)
      }
    } catch (error) {
      console.error("[PreCallLobby] Failed to fetch profiles:", error)
    } finally {
      setIsLoadingProfiles(false)
    }
  }, [])

  // Initial profile fetch when picker opens
  useEffect(() => {
    if (participantSearchOpen && availableProfiles.length === 0) {
      fetchProfiles()
    }
  }, [participantSearchOpen, availableProfiles.length, fetchProfiles])

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

  // Handle participant selection
  const handleSelectParticipant = useCallback((profile: ProfileData) => {
    const isAlreadySelected = selectedParticipants.some((p) => p.id === profile.id)
    if (isAlreadySelected) {
      setSelectedParticipants((prev) => prev.filter((p) => p.id !== profile.id))
    } else {
      setSelectedParticipants((prev) => [
        ...prev,
        { id: profile.id, name: profile.name, avatarUrl: profile.avatar_url },
      ])
    }
  }, [selectedParticipants])

  // Remove participant
  const handleRemoveParticipant = useCallback((participantId: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== participantId))
  }, [])

  // Handle join with current settings
  const handleJoin = useCallback(() => {
    onJoin({
      startVideoOff: !isVideoEnabled,
      startAudioOff: !isAudioEnabled,
      participants: selectedParticipants,
    })
  }, [onJoin, isVideoEnabled, isAudioEnabled, selectedParticipants])

  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6 overflow-y-auto", className)}>
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

      {/* Device Selection */}
      <div className="w-full max-w-md space-y-3">
        {/* Microphone selection */}
        {formattedMicrophones.length > 0 && (
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0">
              <Mic className="h-4 w-4" />
              Mic
            </Label>
            <Select
              value={currentMic?.device.deviceId || ""}
              onValueChange={(deviceId) => setMicrophone(deviceId)}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {formattedMicrophones.map((mic) => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId}>
                    {mic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Camera selection */}
        {formattedCameras.length > 0 && (
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0">
              <Video className="h-4 w-4" />
              Camera
            </Label>
            <Select
              value={currentCam?.device.deviceId || ""}
              onValueChange={(deviceId) => setCamera(deviceId)}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                {formattedCameras.map((cam) => (
                  <SelectItem key={cam.deviceId} value={cam.deviceId}>
                    {cam.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Speaker selection */}
        {formattedSpeakers.length > 0 && (
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0">
              <Speaker className="h-4 w-4" />
              Speaker
            </Label>
            <Select
              value={currentSpeaker?.device.deviceId || ""}
              onValueChange={(deviceId) => setSpeaker(deviceId)}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                {formattedSpeakers.map((speaker) => (
                  <SelectItem key={speaker.deviceId} value={speaker.deviceId}>
                    {speaker.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Participant Picker */}
      {showParticipantPicker && (
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">
              Participants
            </Label>
            <Popover open={participantSearchOpen} onOpenChange={setParticipantSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isLoading}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder="Search by name or email…"
                    value={participantSearch}
                    onChange={(e) => {
                      const val = e.target.value
                      setParticipantSearch(val)
                      fetchProfiles(val || undefined)
                    }}
                    className="flex h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <Command shouldFilter={false}>
                  <CommandList>
                    {isLoadingProfiles ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No profiles found.</CommandEmpty>
                        <CommandGroup>
                          {availableProfiles.map((profile) => {
                            const isSelected = selectedParticipants.some((p) => p.id === profile.id)
                            return (
                              <CommandItem
                                key={profile.id}
                                value={profile.id}
                                onSelect={() => handleSelectParticipant(profile)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <Avatar className="h-6 w-6 mr-2">
                                  {profile.avatar_url && (
                                    <AvatarImage src={profile.avatar_url} alt={profile.name} />
                                  )}
                                  <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                                    {getInitials(profile.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{profile.name}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected participants display */}
          {selectedParticipants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card pl-1.5 pr-1 py-1"
                >
                  <Avatar className="h-5 w-5">
                    {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.name} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px]">
                      {getInitials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-card-foreground">
                    {p.name.split(" ")[0]}
                  </span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                    onClick={() => handleRemoveParticipant(p.id)}
                    disabled={isLoading}
                    aria-label={`Remove ${p.name}`}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No participants added yet. Click "Add" to invite people.
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
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
