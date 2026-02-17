"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface TypingUser {
  userId: string
  userName: string
  timestamp: number
}

export interface UseTypingIndicatorOptions {
  /**
   * Time in milliseconds after which a typing indicator is considered stale
   * @default 3000
   */
  staleTimeout?: number
  /**
   * Debounce time in milliseconds for sending typing events
   * @default 1000
   */
  debounceMs?: number
}

export interface UseTypingIndicatorReturn {
  /**
   * Map of user IDs to typing user info for users currently typing
   */
  typingUsers: Map<string, TypingUser>
  /**
   * Array of typing users (convenience getter)
   */
  typingUsersArray: TypingUser[]
  /**
   * Call this when the current user is typing (handles debouncing internally)
   */
  sendTyping: () => void
  /**
   * Call this to clear the current user's typing status (e.g., after sending a message)
   */
  clearTyping: () => void
  /**
   * Whether there are any other users currently typing
   */
  isAnyoneTyping: boolean
}

/**
 * Subscribe to typing indicators for a chat using Supabase Broadcast.
 * 
 * Broadcast is ideal for ephemeral events like typing - no database storage needed.
 * Automatically handles debouncing outgoing typing events and clearing stale indicators.
 * 
 * @param chatId - The ID of the chat to subscribe to
 * @param currentUserId - The ID of the current user (to filter out own typing events)
 * @param currentUserName - The display name of the current user
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const { typingUsersArray, sendTyping, clearTyping, isAnyoneTyping } = useTypingIndicator(
 *   chatId,
 *   currentUserProfileId,
 *   currentUserName
 * )
 * 
 * // In message input onChange handler
 * const handleInputChange = (e) => {
 *   setValue(e.target.value)
 *   sendTyping() // Debounced internally
 * }
 * 
 * // After sending a message
 * const handleSend = () => {
 *   sendMessage()
 *   clearTyping()
 * }
 * 
 * // Display typing indicator
 * {isAnyoneTyping && (
 *   <div>{typingUsersArray.map(u => u.userName).join(", ")} is typing...</div>
 * )}
 * ```
 */
export function useTypingIndicator(
  chatId: string | null | undefined,
  currentUserId: string | null | undefined,
  currentUserName: string | null | undefined,
  options: UseTypingIndicatorOptions = {}
): UseTypingIndicatorReturn {
  const { staleTimeout = 3000, debounceMs = 1000 } = options
  
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map())
  
  // Refs for managing debouncing and cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const staleCheckTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up stale typing indicators periodically
  useEffect(() => {
    const checkStaleTyping = () => {
      const now = Date.now()
      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        let changed = false
        
        for (const [userId, user] of newMap) {
          if (now - user.timestamp > staleTimeout) {
            newMap.delete(userId)
            changed = true
          }
        }
        
        return changed ? newMap : prev
      })
    }

    // Check for stale indicators every second
    staleCheckTimerRef.current = setInterval(checkStaleTyping, 1000)

    return () => {
      if (staleCheckTimerRef.current) {
        clearInterval(staleCheckTimerRef.current)
      }
    }
  }, [staleTimeout])

  // Subscribe to typing broadcast channel
  useEffect(() => {
    if (!chatId || !currentUserId) return

    const channelName = `typing:${chatId}`
    
    const channel = supabase.channel(channelName)
    channelRef.current = channel
    
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        // Filter out own typing events
        if (payload.userId === currentUserId) return
        
        setTypingUsers((prev) => {
          const newMap = new Map(prev)
          newMap.set(payload.userId, {
            userId: payload.userId,
            userName: payload.userName,
            timestamp: Date.now(),
          })
          return newMap
        })
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        // Remove user from typing list when they explicitly stop
        if (payload.userId === currentUserId) return
        
        setTypingUsers((prev) => {
          if (!prev.has(payload.userId)) return prev
          const newMap = new Map(prev)
          newMap.delete(payload.userId)
          return newMap
        })
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Typing] Subscribed to typing indicators for chat ${chatId}`)
        }
        if (status === "CHANNEL_ERROR") {
          console.error(`[Typing] Error subscribing to typing channel for chat ${chatId}`)
        }
      })

    // Cleanup: unsubscribe and clear timers
    return () => {
      console.log(`[Typing] Unsubscribing from typing indicators for chat ${chatId}`)
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      supabase.removeChannel(channel)
      channelRef.current = null
      setTypingUsers(new Map())
    }
  }, [chatId, currentUserId])

  // Send typing event (debounced)
  const sendTyping = useCallback(() => {
    if (!chatId || !currentUserId || !currentUserName || !channelRef.current) return

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Send typing event immediately if this is the first call
    // Then debounce subsequent calls
    const sendEvent = () => {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId,
          userName: currentUserName,
        },
      })
    }

    sendEvent()

    // Set up debounce for the next call
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
    }, debounceMs)
  }, [chatId, currentUserId, currentUserName, debounceMs])

  // Clear typing status (call after sending a message)
  const clearTyping = useCallback(() => {
    if (!chatId || !currentUserId || !channelRef.current) return

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Broadcast stop typing event
    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: {
        userId: currentUserId,
      },
    })
  }, [chatId, currentUserId])

  // Convenience getters
  const typingUsersArray = Array.from(typingUsers.values())
  const isAnyoneTyping = typingUsers.size > 0

  return {
    typingUsers,
    typingUsersArray,
    sendTyping,
    clearTyping,
    isAnyoneTyping,
  }
}
