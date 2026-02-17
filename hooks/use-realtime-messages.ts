"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

// Raw message row from the database
export interface MessageRow {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

export type MessageChangePayload = RealtimePostgresChangesPayload<MessageRow>

export interface UseRealtimeMessagesOptions {
  /**
   * Called when a new message is inserted
   */
  onInsert?: (message: MessageRow) => void
  /**
   * Called when a message is updated
   */
  onUpdate?: (message: MessageRow, oldMessage: Partial<MessageRow>) => void
  /**
   * Called when a message is deleted
   */
  onDelete?: (oldMessage: Partial<MessageRow>) => void
  /**
   * Called for any change event (INSERT, UPDATE, DELETE)
   */
  onChange?: (payload: MessageChangePayload) => void
}

/**
 * Subscribe to realtime message changes for a specific chat.
 * 
 * Uses Supabase Realtime to listen for postgres_changes events on the messages table.
 * Automatically cleans up the subscription when the chat changes or component unmounts.
 * 
 * @param chatId - The ID of the chat to subscribe to
 * @param options - Callbacks for different event types
 * 
 * @example
 * ```tsx
 * useRealtimeMessages(chatId, {
 *   onInsert: (message) => {
 *     // Handle new message from another user
 *     if (message.sender_id !== currentUserProfileId) {
 *       // Fetch full message with sender info and add to state
 *     }
 *   },
 *   onUpdate: (message) => {
 *     // Handle edited message
 *     setMessages(prev => prev.map(m => m.id === message.id ? {...m, content: message.content} : m))
 *   },
 *   onDelete: (oldMessage) => {
 *     // Handle deleted message
 *     setMessages(prev => prev.filter(m => m.id !== oldMessage.id))
 *   }
 * })
 * ```
 */
export function useRealtimeMessages(
  chatId: string | null | undefined,
  options: UseRealtimeMessagesOptions = {}
) {
  // Use refs to avoid recreating subscription on callback changes
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!chatId) return

    const channelName = `chat-messages:${chatId}`
    
    const channel = supabase
      .channel(channelName)
      .on<MessageRow>(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          
          // Call the general onChange handler
          optionsRef.current.onChange?.(payload)

          // Call specific event handlers
          switch (eventType) {
            case "INSERT":
              if (newRecord && optionsRef.current.onInsert) {
                optionsRef.current.onInsert(newRecord as MessageRow)
              }
              break
            case "UPDATE":
              if (newRecord && optionsRef.current.onUpdate) {
                optionsRef.current.onUpdate(
                  newRecord as MessageRow,
                  oldRecord as Partial<MessageRow>
                )
              }
              break
            case "DELETE":
              if (oldRecord && optionsRef.current.onDelete) {
                optionsRef.current.onDelete(oldRecord as Partial<MessageRow>)
              }
              break
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to messages for chat ${chatId}`)
        }
        if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime] Error subscribing to chat ${chatId}`)
        }
      })

    // Cleanup: unsubscribe when chatId changes or component unmounts
    return () => {
      console.log(`[Realtime] Unsubscribing from messages for chat ${chatId}`)
      supabase.removeChannel(channel)
    }
  }, [chatId])
}
