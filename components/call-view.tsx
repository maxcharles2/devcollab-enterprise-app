"use client"

import { useState } from "react"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Sparkles,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { users } from "@/lib/mock-data"

const callParticipants = users.slice(0, 6)

export function CallView() {
  const [inCall, setInCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [showPostCall, setShowPostCall] = useState(false)
  const [saveCall, setSaveCall] = useState(true)

  if (showPostCall) {
    return <PostCallView onBack={() => { setShowPostCall(false); setInCall(false) }} saveCall={saveCall} setSaveCall={setSaveCall} />
  }

  if (!inCall) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
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
          {callParticipants.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">{u.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-card-foreground">{u.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        <Button className="gap-2" onClick={() => setInCall(true)}>
          <Video className="h-4 w-4" />
          Start Call
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-foreground/[0.03]">
      {/* Video grid */}
      <div className="flex-1 p-4">
        <div className="grid h-full grid-cols-2 gap-3 lg:grid-cols-3">
          {callParticipants.map((u, i) => (
            <div
              key={u.id}
              className="relative flex items-center justify-center overflow-hidden rounded-lg bg-sidebar"
            >
              {/* Placeholder video canvas */}
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xl">
                  {u.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-2 left-2 rounded bg-sidebar/80 px-2 py-0.5">
                <span className="text-xs font-medium text-sidebar-accent-foreground">
                  {u.name}{i === 0 ? " (You)" : ""}
                </span>
              </div>
              {i === 0 && !cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-sidebar">
                  <VideoOff className="h-8 w-8 text-sidebar-foreground/40" />
                </div>
              )}
              {i === 0 && muted && (
                <div className="absolute right-2 top-2 rounded bg-destructive/80 p-1">
                  <MicOff className="h-3 w-3 text-destructive-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Call controls */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-border bg-card px-4 py-3">
        <Button
          variant={muted ? "destructive" : "outline"}
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setMuted(!muted)}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          <span className="sr-only">{muted ? "Unmute" : "Mute"}</span>
        </Button>
        <Button
          variant={!cameraOn ? "destructive" : "outline"}
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setCameraOn(!cameraOn)}
        >
          {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          <span className="sr-only">{cameraOn ? "Turn off camera" : "Turn on camera"}</span>
        </Button>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-transparent">
          <MonitorUp className="h-4 w-4" />
          <span className="sr-only">Share screen</span>
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setShowPostCall(true)}
        >
          <PhoneOff className="h-4 w-4" />
          <span className="sr-only">Leave call</span>
        </Button>
      </div>
    </div>
  )
}

// ── Post-Call UI ────────────────────────────────────────────────────────────
interface PostCallViewProps {
  onBack: () => void
  saveCall: boolean
  setSaveCall: (v: boolean) => void
}

function PostCallView({ onBack, saveCall, setSaveCall }: PostCallViewProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-xl font-semibold text-foreground">Call Ended</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sprint Planning &middot; 32 minutes &middot; 6 participants</p>

        {/* Save toggle */}
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-medium text-card-foreground">Save this call recording?</Label>
            <span className="text-xs text-muted-foreground">Recording and transcription will be stored for your team.</span>
          </div>
          <Switch checked={saveCall} onCheckedChange={setSaveCall} className="ml-auto" />
        </div>

        {/* Transcription panel */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Transcription</h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Placeholder</span>
          </div>
          <div className="flex flex-col gap-3 text-sm text-foreground/80 leading-relaxed">
            <p><span className="font-medium text-foreground">Riley Davis:</span> Alright everyone, let's kick off sprint 14 planning. We have 42 story points to allocate.</p>
            <p><span className="font-medium text-foreground">Taylor Kim:</span> Backend has 18 points ready, mostly around the new auth middleware and API caching layer.</p>
            <p><span className="font-medium text-foreground">Sam Chen:</span> Frontend is looking at 14 points. The dashboard refactor is the big one at 8 points.</p>
            <p><span className="font-medium text-foreground">Casey Patel:</span> DevOps has about 10 points. We need to finish the CI/CD migration this sprint.</p>
            <p><span className="font-medium text-foreground">Riley Davis:</span> That puts us right at capacity. Let's prioritize and finalize after lunch.</p>
          </div>
        </div>

        {/* AI summary */}
        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Summary</h3>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Generated</span>
          </div>
          <div className="flex flex-col gap-2 text-sm text-foreground/80 leading-relaxed">
            <p>The team reviewed sprint 14 capacity (42 story points) and allocated work across three tracks:</p>
            <ul className="ml-4 flex flex-col gap-1 list-disc">
              <li><span className="font-medium text-foreground">Backend (18 pts):</span> Auth middleware refactor, API caching layer implementation</li>
              <li><span className="font-medium text-foreground">Frontend (14 pts):</span> Dashboard UI refactor (8 pts), component library updates</li>
              <li><span className="font-medium text-foreground">DevOps (10 pts):</span> CI/CD pipeline migration, monitoring setup</li>
            </ul>
            <p className="mt-1"><span className="font-medium text-foreground">Action items:</span> Finalize backlog prioritization after lunch, Taylor to create migration plan document.</p>
          </div>
        </div>

        <Button variant="outline" className="mt-6 bg-transparent" onClick={onBack}>
          Back to Calls
        </Button>
      </div>
    </div>
  )
}
