"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

/**
 * Standalone test page for verifying Supabase Realtime and Broadcast.
 * Access at /test-realtime (no auth required).
 *
 * Use two browser windows side-by-side to test:
 * 1. Realtime messages: Open a DM in the main app in both windows (different users)
 * 2. Typing indicators: Type in one window, see "X is typing..." in the other
 */
export default function TestRealtimePage() {
  const [status, setStatus] = useState<string>("Connecting...")
  const [events, setEvents] = useState<string[]>([])
  const [chatId, setChatId] = useState("33333333-3333-3333-3333-333333333301")

  const addEvent = (msg: string) => {
    setEvents((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20))
  }

  useEffect(() => {
    addEvent("Test page loaded - Supabase Realtime verification")
    setStatus("Checking connection...")

    const channel = supabase.channel("test-realtime-connection")
    channel
      .on("broadcast", { event: "ping" }, ({ payload }) => {
        addEvent(`Broadcast received: ${JSON.stringify(payload)}`)
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStatus("Connected ✓")
          addEvent("Realtime channel subscribed successfully")
        }
        if (status === "CHANNEL_ERROR") {
          setStatus("Connection error")
          addEvent("Channel error - check Supabase config")
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const sendPing = () => {
    const ch = supabase.channel("test-realtime-connection")
    ch.send({
      type: "broadcast",
      event: "ping",
      payload: { from: "test-page", time: Date.now() },
    })
    addEvent("Sent broadcast ping")
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-background p-8 font-sans">
      <div>
        <h1 className="text-2xl font-bold">Realtime Test Page</h1>
        <p className="mt-2 text-muted-foreground">
          Use two browser windows to verify live updates. No auth required for this page.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Connection Status</h2>
        <p className="mt-1 text-sm">{status}</p>
        <button
          type="button"
          onClick={sendPing}
          className="mt-2 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Send broadcast ping
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          Open this page in two tabs and click the button in one tab. The other should log the event.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Manual Test Checklist</h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Run <code className="rounded bg-muted px-1">npm run dev</code></li>
          <li>Open two browser windows (or one normal + one incognito for different users)</li>
          <li>Sign in as User A in window 1, User B in window 2</li>
          <li>Create or open a DM between the two users in both windows</li>
          <li>
            <strong>Realtime messages:</strong> Send a message in window 1 → it should appear in
            window 2 without refresh
          </li>
          <li>
            <strong>Typing indicators:</strong> Type in the message input in window 1 → window 2
            should show &quot;User A is typing...&quot;
          </li>
        </ol>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Event Log</h2>
        <div className="mt-2 max-h-48 overflow-y-auto font-mono text-xs">
          {events.length === 0 ? (
            <p className="text-muted-foreground">No events yet</p>
          ) : (
            events.map((e, i) => (
              <div key={i} className="border-b border-border/50 py-1">
                {e}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Chat ID for debugging</h2>
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          className="mt-2 w-full rounded border border-input bg-background px-2 py-1 font-mono text-sm"
          placeholder="Paste a chat ID to inspect"
        />
      </div>
    </div>
  )
}
