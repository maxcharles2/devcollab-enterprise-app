"use client"

import { useMemo, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { VideoTile, VideoTileSkeleton } from "@/components/video-tile"
import type { CallParticipantInfo } from "@/hooks/use-daily-call"

/**
 * Layout type for the video grid based on participant count
 */
type GridLayout = 
  | "single"     // 1 participant - full screen
  | "duo"        // 2 participants - side by side 50/50
  | "grid-2x2"   // 3-4 participants - 2x2 grid
  | "grid-3x2"   // 5-6 participants - 3 columns, 2 rows

/**
 * Props for the VideoGrid component
 */
export interface VideoGridProps {
  /** List of participants to display */
  participants: CallParticipantInfo[]
  /** Whether to allow pinning participants */
  allowPinning?: boolean
  /** Callback when a participant is pinned/unpinned */
  onPinnedChange?: (sessionId: string | null) => void
  /** Externally controlled pinned participant */
  pinnedParticipantId?: string | null
  /** Additional class names for the container */
  className?: string
}

/**
 * Determine the grid layout based on participant count
 */
function getGridLayout(count: number): GridLayout {
  if (count <= 1) return "single"
  if (count === 2) return "duo"
  if (count <= 4) return "grid-2x2"
  return "grid-3x2"
}

/**
 * Get CSS classes for the grid container based on layout
 */
function getGridContainerClasses(layout: GridLayout): string {
  switch (layout) {
    case "single":
      return "grid-cols-1 grid-rows-1"
    case "duo":
      return "grid-cols-2 grid-rows-1"
    case "grid-2x2":
      return "grid-cols-2 grid-rows-2"
    case "grid-3x2":
      return "grid-cols-2 grid-rows-3 lg:grid-cols-3 lg:grid-rows-2"
  }
}

/**
 * VideoGrid displays participants in a dynamic grid layout.
 * 
 * Layout rules based on participant count:
 * - 1 participant: Full screen
 * - 2 participants: Side by side (50/50)
 * - 3-4 participants: 2x2 grid
 * - 5-6 participants: 2x3 grid (3 columns on large screens)
 * 
 * Features:
 * - Automatic layout adjustment based on participant count
 * - Optional participant pinning (featured view)
 * - Screen share prioritization
 * - Responsive design for different screen sizes
 * 
 * @example
 * ```tsx
 * function CallView() {
 *   const { participants } = useDailyCall()
 *   
 *   return (
 *     <VideoGrid
 *       participants={participants}
 *       allowPinning={true}
 *     />
 *   )
 * }
 * ```
 */
export function VideoGrid({
  participants,
  allowPinning = true,
  onPinnedChange,
  pinnedParticipantId: externalPinnedId,
  className,
}: VideoGridProps) {
  // Internal pinned state (used if no external control provided)
  const [internalPinnedId, setInternalPinnedId] = useState<string | null>(null)
  
  // Use external pinned ID if provided, otherwise use internal
  const isControlled = externalPinnedId !== undefined
  const pinnedId = isControlled ? externalPinnedId : internalPinnedId

  // Handle pin toggle
  const handlePinToggle = useCallback((sessionId: string) => {
    const newPinnedId = pinnedId === sessionId ? null : sessionId
    
    if (isControlled) {
      onPinnedChange?.(newPinnedId)
    } else {
      setInternalPinnedId(newPinnedId)
      onPinnedChange?.(newPinnedId)
    }
  }, [pinnedId, isControlled, onPinnedChange])

  // Find participant who is screen sharing (prioritize for featured view)
  const screenSharingParticipant = useMemo(() => {
    return participants.find(p => p.isScreenSharing)
  }, [participants])

  // Determine if we should show featured layout (pinned or screen share)
  const featuredParticipant = useMemo(() => {
    // Screen share takes priority
    if (screenSharingParticipant) {
      return screenSharingParticipant
    }
    // Then check for pinned participant
    if (pinnedId) {
      return participants.find(p => p.sessionId === pinnedId)
    }
    return null
  }, [screenSharingParticipant, pinnedId, participants])

  // Sort participants: local first, then others
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      // Local participant first
      if (a.isLocal && !b.isLocal) return -1
      if (!a.isLocal && b.isLocal) return 1
      // Then by name
      return a.userName.localeCompare(b.userName)
    })
  }, [participants])

  // If there's a featured participant, show featured layout
  if (featuredParticipant && participants.length > 1) {
    return (
      <FeaturedLayout
        featuredParticipant={featuredParticipant}
        participants={sortedParticipants}
        isScreenShare={!!screenSharingParticipant}
        pinnedId={pinnedId}
        allowPinning={allowPinning}
        onPinToggle={handlePinToggle}
        className={className}
      />
    )
  }

  // Standard grid layout
  const layout = getGridLayout(participants.length)
  const gridClasses = getGridContainerClasses(layout)

  return (
    <div
      className={cn(
        "video-grid grid h-full w-full gap-3 p-4",
        gridClasses,
        className
      )}
    >
      {sortedParticipants.map((participant) => (
        <VideoTile
          key={participant.sessionId}
          participant={participant}
          isFeatured={layout === "single"}
          isPinned={pinnedId === participant.sessionId}
          onClick={allowPinning && participants.length > 1 
            ? () => handlePinToggle(participant.sessionId) 
            : undefined
          }
          className={cn(
            "min-h-0",
            // Single participant gets more height
            layout === "single" && "h-full"
          )}
        />
      ))}
    </div>
  )
}

/**
 * Props for the FeaturedLayout component
 */
interface FeaturedLayoutProps {
  featuredParticipant: CallParticipantInfo
  participants: CallParticipantInfo[]
  isScreenShare: boolean
  pinnedId: string | null
  allowPinning: boolean
  onPinToggle: (sessionId: string) => void
  className?: string
}

/**
 * FeaturedLayout displays one participant prominently with others in a sidebar.
 * Used when someone is screen sharing or a participant is pinned.
 */
function FeaturedLayout({
  featuredParticipant,
  participants,
  isScreenShare,
  pinnedId,
  allowPinning,
  onPinToggle,
  className,
}: FeaturedLayoutProps) {
  // Get non-featured participants for the sidebar
  const sidebarParticipants = useMemo(() => {
    // If showing screen share, include everyone (including the sharer's camera) in sidebar
    if (isScreenShare) {
      return participants
    }
    // If pinned, exclude the pinned participant from sidebar
    return participants.filter(p => p.sessionId !== featuredParticipant.sessionId)
  }, [participants, featuredParticipant, isScreenShare])

  return (
    <div
      className={cn(
        "video-grid-featured flex h-full w-full gap-3 p-4",
        // Stack vertically on small screens
        "flex-col lg:flex-row",
        className
      )}
    >
      {/* Featured/Main video (screen share or pinned) */}
      <div className="relative flex-1 min-h-0 lg:flex-[3]">
        <VideoTile
          participant={featuredParticipant}
          isFeatured={true}
          showScreenShare={isScreenShare}
          isPinned={!isScreenShare && pinnedId === featuredParticipant.sessionId}
          onClick={!isScreenShare && allowPinning 
            ? () => onPinToggle(featuredParticipant.sessionId)
            : undefined
          }
          className="h-full"
        />
        
        {/* Screen share label */}
        {isScreenShare && (
          <div className="absolute left-4 top-4 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            {featuredParticipant.isLocal ? "You are sharing" : `${featuredParticipant.userName}'s screen`}
          </div>
        )}
      </div>

      {/* Sidebar with other participants */}
      {sidebarParticipants.length > 0 && (
        <div
          className={cn(
            "flex gap-2 overflow-auto",
            // Horizontal scroll on small screens, vertical on large
            "flex-row lg:flex-col",
            "h-24 lg:h-full lg:w-48 lg:flex-none"
          )}
        >
          {sidebarParticipants.map((participant) => (
            <VideoTile
              key={participant.sessionId}
              participant={participant}
              isPinned={pinnedId === participant.sessionId}
              onClick={allowPinning ? () => onPinToggle(participant.sessionId) : undefined}
              className={cn(
                "shrink-0",
                // Fixed size in sidebar
                "h-24 w-32 lg:h-28 lg:w-full"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * VideoGridSkeleton is a loading placeholder for the video grid
 */
export function VideoGridSkeleton({ 
  count = 4,
  className 
}: { 
  count?: number
  className?: string 
}) {
  const layout = getGridLayout(count)
  const gridClasses = getGridContainerClasses(layout)

  return (
    <div
      className={cn(
        "video-grid-skeleton grid h-full w-full gap-3 p-4",
        gridClasses,
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <VideoTileSkeleton key={i} className="min-h-0" />
      ))}
    </div>
  )
}

/**
 * EmptyVideoGrid is shown when there are no participants
 */
export function EmptyVideoGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "video-grid-empty flex h-full w-full flex-col items-center justify-center gap-4 p-4",
        className
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-10 w-10 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-foreground">No participants</h3>
        <p className="text-sm text-muted-foreground">
          Waiting for others to join the call...
        </p>
      </div>
    </div>
  )
}
