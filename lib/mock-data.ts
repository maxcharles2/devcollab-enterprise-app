// ── Mock Users ──────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  avatar: string
  status: "online" | "away" | "offline"
  role: string
}

export const currentUser: User = {
  id: "u1",
  name: "Alex Morgan",
  email: "alex@devcollab.io",
  avatar: "AM",
  status: "online",
  role: "Engineering Lead",
}

export const users: User[] = [
  currentUser,
  { id: "u2", name: "Sam Chen", email: "sam@devcollab.io", avatar: "SC", status: "online", role: "Frontend Dev" },
  { id: "u3", name: "Jordan Lee", email: "jordan@devcollab.io", avatar: "JL", status: "away", role: "Designer" },
  { id: "u4", name: "Taylor Kim", email: "taylor@devcollab.io", avatar: "TK", status: "online", role: "Backend Dev" },
  { id: "u5", name: "Riley Davis", email: "riley@devcollab.io", avatar: "RD", status: "offline", role: "PM" },
  { id: "u6", name: "Casey Patel", email: "casey@devcollab.io", avatar: "CP", status: "online", role: "DevOps" },
  { id: "u7", name: "Morgan Wright", email: "morgan@devcollab.io", avatar: "MW", status: "away", role: "QA Engineer" },
  { id: "u8", name: "Jamie Torres", email: "jamie@devcollab.io", avatar: "JT", status: "online", role: "Full Stack Dev" },
]

// ── Mock Channels ───────────────────────────────────────────────────────────
export interface Channel {
  id: string
  name: string
  description: string
  unreadCount: number
}

export const channels: Channel[] = [
  { id: "ch1", name: "general", description: "Company-wide announcements and updates", unreadCount: 3 },
  { id: "ch2", name: "engineering", description: "Engineering discussions and code reviews", unreadCount: 7 },
  { id: "ch3", name: "design", description: "Design reviews, feedback, and assets", unreadCount: 0 },
  { id: "ch4", name: "announcements", description: "Official company announcements", unreadCount: 1 },
]

// ── Mock Messages ───────────────────────────────────────────────────────────
export interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  channelId?: string
  chatId?: string
  file?: FileAttachment
}

export interface FileAttachment {
  name: string
  type: "image" | "doc" | "pdf" | "pptx" | "xlsx"
  size: string
}

export const channelMessages: Record<string, Message[]> = {
  ch1: [
    { id: "m1", senderId: "u5", content: "Welcome to DevCollab! We're excited to have everyone onboard for the new sprint.", timestamp: "9:00 AM", channelId: "ch1" },
    { id: "m2", senderId: "u2", content: "Thanks Riley! Looking forward to collaborating with the team.", timestamp: "9:05 AM", channelId: "ch1" },
    { id: "m3", senderId: "u3", content: "Just pushed the new design system tokens. Let me know if anyone has questions.", timestamp: "9:15 AM", channelId: "ch1" },
    { id: "m4", senderId: "u1", content: "Great work Jordan. I'll review those this afternoon.", timestamp: "9:22 AM", channelId: "ch1" },
    { id: "m5", senderId: "u6", content: "CI pipeline is green across all environments. Ship it!", timestamp: "9:30 AM", channelId: "ch1" },
    { id: "m6", senderId: "u4", content: "The API refactor is complete. Docs are updated in the engineering channel.", timestamp: "10:00 AM", channelId: "ch1" },
  ],
  ch2: [
    { id: "m7", senderId: "u4", content: "I've refactored the auth middleware. PR #247 is ready for review.", timestamp: "8:30 AM", channelId: "ch2" },
    { id: "m8", senderId: "u1", content: "Looking at it now. The token refresh logic looks much cleaner.", timestamp: "8:45 AM", channelId: "ch2" },
    { id: "m9", senderId: "u8", content: "Should we migrate to the new ORM? I've been benchmarking and it's 3x faster.", timestamp: "9:10 AM", channelId: "ch2" },
    { id: "m10", senderId: "u6", content: "Let's discuss in standup. I have some concerns about migration risk.", timestamp: "9:20 AM", channelId: "ch2" },
    { id: "m11", senderId: "u2", content: "Frontend bundle size is down 22% after tree-shaking improvements.", timestamp: "9:45 AM", channelId: "ch2" },
  ],
  ch3: [
    { id: "m12", senderId: "u3", content: "New component library preview is live. Check the Figma link in the thread.", timestamp: "10:00 AM", channelId: "ch3" },
    { id: "m13", senderId: "u5", content: "The new dashboard layout is looking sharp. Great work on the spacing.", timestamp: "10:15 AM", channelId: "ch3" },
    { id: "m14", senderId: "u7", content: "Found a couple of contrast issues on the dark theme. I'll file tickets.", timestamp: "10:30 AM", channelId: "ch3" },
  ],
  ch4: [
    { id: "m15", senderId: "u5", content: "Team all-hands is next Thursday at 2 PM. Please mark your calendars.", timestamp: "8:00 AM", channelId: "ch4" },
    { id: "m16", senderId: "u5", content: "Q1 goals have been published. Check the wiki for your team's OKRs.", timestamp: "11:00 AM", channelId: "ch4" },
  ],
}

// ── Mock DMs / Group Chats ──────────────────────────────────────────────────
export interface Chat {
  id: string
  name: string
  participants: string[]
  isGroup: boolean
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export const chats: Chat[] = [
  { id: "dm1", name: "Sam Chen", participants: ["u1", "u2"], isGroup: false, lastMessage: "Sounds good, let's sync at 3.", lastMessageTime: "10:30 AM", unreadCount: 2 },
  { id: "dm2", name: "Jordan Lee", participants: ["u1", "u3"], isGroup: false, lastMessage: "The mockups are attached.", lastMessageTime: "9:45 AM", unreadCount: 0 },
  { id: "dm3", name: "Taylor Kim", participants: ["u1", "u4"], isGroup: false, lastMessage: "PR approved!", lastMessageTime: "Yesterday", unreadCount: 0 },
  { id: "gc1", name: "Sprint Planning", participants: ["u1", "u2", "u4", "u5", "u6", "u8"], isGroup: true, lastMessage: "Let's finalize the backlog today.", lastMessageTime: "11:00 AM", unreadCount: 5 },
  { id: "gc2", name: "Design Review", participants: ["u1", "u3", "u5", "u7"], isGroup: true, lastMessage: "New designs look great!", lastMessageTime: "Yesterday", unreadCount: 0 },
]

export const chatMessages: Record<string, Message[]> = {
  dm1: [
    { id: "dm1-1", senderId: "u2", content: "Hey Alex, are you free to pair on the auth module?", timestamp: "10:00 AM", chatId: "dm1" },
    { id: "dm1-2", senderId: "u1", content: "Sure! How about 3 PM?", timestamp: "10:15 AM", chatId: "dm1" },
    { id: "dm1-3", senderId: "u2", content: "Sounds good, let's sync at 3.", timestamp: "10:30 AM", chatId: "dm1" },
  ],
  dm2: [
    { id: "dm2-1", senderId: "u3", content: "I've finished the onboarding flow mockups.", timestamp: "9:00 AM", chatId: "dm2" },
    { id: "dm2-2", senderId: "u1", content: "Awesome, can you share the Figma link?", timestamp: "9:20 AM", chatId: "dm2" },
    { id: "dm2-3", senderId: "u3", content: "The mockups are attached.", timestamp: "9:45 AM", chatId: "dm2", file: { name: "onboarding-flow-v2.pdf", type: "pdf", size: "3.2 MB" } },
  ],
  dm3: [
    { id: "dm3-1", senderId: "u1", content: "Just reviewed your PR on the API refactor.", timestamp: "Yesterday", chatId: "dm3" },
    { id: "dm3-2", senderId: "u4", content: "Thanks! Any blockers?", timestamp: "Yesterday", chatId: "dm3" },
    { id: "dm3-3", senderId: "u1", content: "PR approved!", timestamp: "Yesterday", chatId: "dm3" },
  ],
  gc1: [
    { id: "gc1-1", senderId: "u5", content: "Good morning team. Sprint 14 planning starts now.", timestamp: "9:00 AM", chatId: "gc1" },
    { id: "gc1-2", senderId: "u4", content: "I've got the backend tasks estimated and ready.", timestamp: "9:05 AM", chatId: "gc1" },
    { id: "gc1-3", senderId: "u2", content: "Frontend is also ready. We have 34 story points queued.", timestamp: "9:10 AM", chatId: "gc1" },
    { id: "gc1-4", senderId: "u6", content: "Infra tasks are light this sprint, about 8 points.", timestamp: "9:15 AM", chatId: "gc1" },
    { id: "gc1-5", senderId: "u5", content: "Let's finalize the backlog today.", timestamp: "11:00 AM", chatId: "gc1" },
  ],
  gc2: [
    { id: "gc2-1", senderId: "u3", content: "Sharing the latest iteration of the dashboard.", timestamp: "Yesterday", chatId: "gc2" },
    { id: "gc2-2", senderId: "u7", content: "Tested on mobile and it looks great.", timestamp: "Yesterday", chatId: "gc2" },
    { id: "gc2-3", senderId: "u5", content: "New designs look great!", timestamp: "Yesterday", chatId: "gc2" },
  ],
}

// ── Mock Calendar Events ────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  participants: string[]
  color: string
}

export const calendarEvents: CalendarEvent[] = [
  { id: "ev1", title: "Daily Standup", date: "2026-02-09", startTime: "09:00", endTime: "09:30", participants: ["u1", "u2", "u4", "u5", "u6"], color: "bg-primary" },
  { id: "ev2", title: "Sprint Planning", date: "2026-02-09", startTime: "10:00", endTime: "11:30", participants: ["u1", "u2", "u4", "u5", "u6", "u8"], color: "bg-chart-2" },
  { id: "ev3", title: "Design Review", date: "2026-02-10", startTime: "14:00", endTime: "15:00", participants: ["u1", "u3", "u5", "u7"], color: "bg-chart-1" },
  { id: "ev4", title: "1:1 with Taylor", date: "2026-02-10", startTime: "11:00", endTime: "11:30", participants: ["u1", "u4"], color: "bg-primary" },
  { id: "ev5", title: "API Architecture", date: "2026-02-11", startTime: "13:00", endTime: "14:00", participants: ["u1", "u4", "u6", "u8"], color: "bg-chart-2" },
  { id: "ev6", title: "Team All-Hands", date: "2026-02-12", startTime: "14:00", endTime: "15:30", participants: ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"], color: "bg-chart-1" },
  { id: "ev7", title: "Code Review Session", date: "2026-02-13", startTime: "10:00", endTime: "10:45", participants: ["u1", "u2", "u8"], color: "bg-primary" },
]

// ── Week days helper ────────────────────────────────────────────────────────
export function getWeekDays(startDate: string) {
  const start = new Date(startDate)
  const days: { date: string; label: string; dayName: string }[] = []
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({
      date: d.toISOString().split("T")[0],
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: dayNames[d.getDay()],
    })
  }
  return days
}
